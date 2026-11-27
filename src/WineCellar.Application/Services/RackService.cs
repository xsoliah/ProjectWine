using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;
using static WineCellar.Application.Mapping;

namespace WineCellar.Application.Services;

/// <summary>The user's wine racks and which bottle lies in which slot.</summary>
public class RackService(IAppDbContext db, ICurrentUser user, TimeProvider time)
{
    public async Task<IReadOnlyList<RackSummaryDto>> ListAsync(CancellationToken ct = default)
    {
        var racks = await db.Racks.AsNoTracking()
            .Where(r => r.OwnerId == user.UserId)
            .Select(r => new { Rack = r, Occupied = r.Slots.Count })
            .ToListAsync(ct);

        return racks
            .OrderBy(x => x.Rack.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(x => new RackSummaryDto(x.Rack.Id, x.Rack.Name, x.Rack.Height, x.Rack.Width,
                x.Rack.Capacity, x.Occupied, x.Rack.Capacity - x.Occupied))
            .ToList();
    }

    public async Task<RackDto> GetAsync(Guid id, CancellationToken ct = default) =>
        ToDto(await FindRackAsync(id, track: false, ct));

    public async Task<RackDto> CreateAsync(SaveRackRequest request, CancellationToken ct = default)
    {
        var rack = new Rack { OwnerId = user.UserId };
        rack.Set(request.Name, request.Height, request.Width);
        await EnsureNameFreeAsync(rack, exceptId: null, ct);

        db.Racks.Add(rack);
        await SaveAsync(ct);
        return ToDto(rack);
    }

    /// <summary>Renames and resizes. Shrinking is refused while an occupied slot would fall outside.</summary>
    public async Task<RackDto> UpdateAsync(Guid id, SaveRackRequest request, CancellationToken ct = default)
    {
        var rack = await FindRackAsync(id, track: true, ct);
        rack.Set(request.Name, request.Height, request.Width);

        var outside = rack.Slots
            .Where(s => !rack.Contains(s.Row, s.Column))
            .OrderBy(s => s.Row).ThenBy(s => s.Column)
            .ToList();
        if (outside.Count > 0)
        {
            var list = string.Join("; ", outside.Select(s => $"Reihe {s.Row}, Spalte {s.Column} ({s.Wine.Name})"));
            throw new DomainException(
                $"Das Regal kann nicht verkleinert werden, weil Flaschen außerhalb liegen würden: {list}. " +
                "Bitte diese Flaschen zuerst umlagern oder herausnehmen.");
        }

        await EnsureNameFreeAsync(rack, exceptId: id, ct);
        await CellarRoomService.EnsureStillFitsAsync(db, user.UserId, rack, ct);
        await SaveAsync(ct);
        return ToDto(rack);
    }

    /// <summary>Deletes the rack; its bottles stay in the cellar as not placed.</summary>
    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var rack = await FindRackAsync(id, track: true, ct);
        db.RackSlots.RemoveRange(rack.Slots);
        db.Racks.Remove(rack);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Puts one bottle of a wine into a free slot.</summary>
    public async Task<RackDto> PlaceAsync(Guid rackId, PlaceBottleRequest request, CancellationToken ct = default)
    {
        var rack = await FindRackAsync(rackId, track: true, ct);
        var wine = await db.Wines.Include(w => w.Slots)
                       .FirstOrDefaultAsync(w => w.Id == request.WineId && w.OwnerId == user.UserId, ct)
                   ?? throw new NotFoundException("Wein nicht gefunden.");

        EnsureCanPlace(rack, request.Row, request.Column);
        EnsureBottlesLeft(wine, 1);
        AddSlot(rack, wine, request.Row, request.Column);
        await SaveAsync(ct);
        return ToDto(rack);
    }

    /// <summary>
    /// Puts several bottles of one wine into free slots (possibly in several racks) with a single save:
    /// all of them or none. Checks are the same as for <see cref="PlaceAsync"/>.
    /// </summary>
    public async Task<IReadOnlyList<SlotLocationDto>> PlaceManyAsync(PlaceBottlesRequest request, CancellationToken ct = default)
    {
        var targets = request.Slots ?? [];
        if (targets.Count == 0) throw new DomainException("Es wurde kein Fach angegeben.");

        var wine = await db.Wines.Include(w => w.Slots)
                       .FirstOrDefaultAsync(w => w.Id == request.WineId && w.OwnerId == user.UserId, ct)
                   ?? throw new NotFoundException("Wein nicht gefunden.");

        if (targets.GroupBy(t => (t.RackId, t.Row, t.Column)).Any(g => g.Count() > 1))
            throw new DomainException("Ein Fach wurde mehrfach angegeben.");

        var racks = new Dictionary<Guid, Rack>();
        foreach (var id in targets.Select(t => t.RackId).Distinct())
            racks[id] = await FindRackAsync(id, track: true, ct);

        foreach (var t in targets) EnsureCanPlace(racks[t.RackId], t.Row, t.Column);
        EnsureBottlesLeft(wine, targets.Count);

        var added = targets.Select(t => AddSlot(racks[t.RackId], wine, t.Row, t.Column)).ToList();
        await SaveAsync(ct);
        return added.Select(s => new SlotLocationDto(s.Id, s.RackId, s.Rack.Name, s.Row, s.Column)).ToList();
    }

    private static void EnsureCanPlace(Rack rack, int row, int column)
    {
        rack.EnsureContains(row, column);
        EnsureSlotFree(rack, row, column, exceptSlotId: null);
    }

    private static void EnsureBottlesLeft(Wine wine, int additional)
    {
        if (wine.Slots.Count + additional <= wine.Quantity) return;
        var unplaced = Math.Max(0, wine.Quantity - wine.Slots.Count);
        throw new DomainException(wine.Quantity == 0
            ? $"Von „{wine.Name}“ ist keine Flasche mehr im Keller."
            : unplaced == 0
                ? $"Alle {wine.Quantity} Flasche(n) von „{wine.Name}“ sind bereits eingelagert."
                : $"Von „{wine.Name}“ sind nur noch {unplaced} Flasche(n) nicht eingelagert, nicht {additional}.");
    }

    private RackSlot AddSlot(Rack rack, Wine wine, int row, int column)
    {
        var slot = new RackSlot
        {
            RackId = rack.Id,
            Rack = rack,
            Row = row,
            Column = column,
            WineId = wine.Id,
            Wine = wine,
            OwnerId = user.UserId
        };
        db.RackSlots.Add(slot);
        return slot;
    }

    /// <summary>Moves a placed bottle to a free slot of the same or another own rack.</summary>
    public async Task<RackDto> MoveAsync(Guid slotId, MoveBottleRequest request, CancellationToken ct = default)
    {
        var slot = await FindSlotAsync(slotId, ct);
        var target = await FindRackAsync(request.RackId, track: true, ct);

        target.EnsureContains(request.Row, request.Column);
        EnsureSlotFree(target, request.Row, request.Column, exceptSlotId: slot.Id);

        slot.RackId = target.Id;
        slot.Rack = target;
        slot.Row = request.Row;
        slot.Column = request.Column;
        await SaveAsync(ct);
        return ToDto(target);
    }

    /// <summary>Takes a bottle out of its slot; it stays in the cellar as not placed.</summary>
    public async Task<RackDto> RemoveAsync(Guid slotId, CancellationToken ct = default)
    {
        var slot = await FindSlotAsync(slotId, ct);
        var rackId = slot.RackId;
        db.RackSlots.Remove(slot);
        await db.SaveChangesAsync(ct);
        return await GetAsync(rackId, ct);
    }

    /// <summary>Drinks, sells or gifts exactly the bottle in this slot: frees the slot and writes the archive entry.</summary>
    public async Task<ArchiveEntryDto> ConsumeFromSlotAsync(Guid slotId, ConsumeRequest request, CancellationToken ct = default)
    {
        if (request.Quantity != 1)
            throw new DomainException("Aus einem Fach kann genau eine Flasche entnommen werden.");

        var slot = await FindSlotAsync(slotId, ct);
        var wine = slot.Wine;
        var date = request.Date ?? DateOnly.FromDateTime(time.GetLocalNow().DateTime);

        var record = wine.Consume(
            request.Kind, 1, date, Clean(request.Counterparty), request.Price, request.Rating, Clean(request.TastingNote));

        db.RackSlots.Remove(slot);
        db.ConsumptionRecords.Add(record);
        await db.SaveChangesAsync(ct);
        return record.ToDto(wine);
    }

    private static RackDto ToDto(Rack rack)
    {
        var slots = rack.Slots
            .OrderBy(s => s.Row).ThenBy(s => s.Column)
            .Select(s => new RackSlotDto(s.Id, s.Row, s.Column, s.Wine.ToRackWine()))
            .ToList();
        return new RackDto(rack.Id, rack.Name, rack.Height, rack.Width, rack.Capacity,
            slots.Count, rack.Capacity - slots.Count, slots);
    }

    private static void EnsureSlotFree(Rack rack, int row, int column, Guid? exceptSlotId)
    {
        var occupant = rack.Slots.FirstOrDefault(s => s.Row == row && s.Column == column && s.Id != exceptSlotId);
        if (occupant is not null)
            throw new ConflictException(
                $"Das Fach Reihe {row}, Spalte {column} im Regal „{rack.Name}“ ist bereits mit „{occupant.Wine.Name}“ belegt.");
    }

    private async Task EnsureNameFreeAsync(Rack rack, Guid? exceptId, CancellationToken ct)
    {
        var taken = await db.Racks.AnyAsync(r =>
            r.OwnerId == user.UserId && r.NormalizedName == rack.NormalizedName && r.Id != exceptId, ct);
        if (taken) throw new ConflictException($"Es gibt bereits ein Regal „{rack.Name}“.");
    }

    /// <summary>The unique slot index also protects against concurrent requests.</summary>
    private async Task SaveAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException(
                "Das Fach oder der Regalname wurde gerade anderweitig vergeben. Bitte die Ansicht neu laden.");
        }
    }

    private async Task<Rack> FindRackAsync(Guid id, bool track, CancellationToken ct)
    {
        var racks = track ? db.Racks.AsQueryable() : db.Racks.AsNoTracking();
        return await racks
                   .Include(r => r.Slots).ThenInclude(s => s.Wine)
                   .FirstOrDefaultAsync(r => r.Id == id && r.OwnerId == user.UserId, ct)
               ?? throw new NotFoundException("Regal nicht gefunden.");
    }

    private async Task<RackSlot> FindSlotAsync(Guid id, CancellationToken ct) =>
        await db.RackSlots
            .Include(s => s.Wine)
            .Include(s => s.Rack)
            .FirstOrDefaultAsync(s => s.Id == id && s.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Fach nicht gefunden.");
}
