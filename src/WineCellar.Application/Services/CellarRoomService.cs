using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>The user's cellar room (dimensions) and where the racks stand in it.</summary>
public class CellarRoomService(IAppDbContext db, ICurrentUser user)
{
    public async Task<CellarRoomDto> GetAsync(CancellationToken ct = default)
    {
        var room = await FindRoomAsync(track: false, ct) ?? new CellarRoom();
        var racks = await db.Racks.AsNoTracking()
            .Where(r => r.OwnerId == user.UserId)
            .Include(r => r.Slots).ThenInclude(s => s.Wine)
            .ToListAsync(ct);
        return ToDto(room, racks);
    }

    public async Task<CellarRoomDto> SaveAsync(SaveCellarRoomRequest request, CancellationToken ct = default)
    {
        var room = await FindRoomAsync(track: true, ct);
        var isNew = room is null;
        room ??= new CellarRoom { OwnerId = user.UserId };
        room.Set(request.WidthCm, request.DepthCm, request.HeightCm);

        var racks = await LoadRacksAsync(ct);
        if (room.HasDoor && CellarRoom.CheckDoor(room.DoorWall!.Value, room.DoorOffsetCm!.Value, room.WidthCm, room.DepthCm) is not null)
            throw new ConflictException("Der Raum kann nicht verkleinert werden: Die Tür würde nicht mehr in ihre Wand passen.");
        foreach (var rack in racks.Where(r => r.IsPlaced && CellarRoom.CheckHeight(room.HeightCm, r, r.ElevationCm) is not null))
            throw new ConflictException(
                $"Der Raum kann nicht niedriger werden: Das Regal „{rack.Name}“ würde nicht mehr unter die Decke passen.");
        foreach (var rack in racks.Where(r => r.CurrentFootprint is { } f && !f.IsInside(room.WidthCm, room.DepthCm)))
            throw new ConflictException(
                $"Der Raum kann nicht verkleinert werden: Das Regal „{rack.Name}“ würde nicht mehr hineinpassen.");

        if (isNew) db.CellarRooms.Add(room);
        await db.SaveChangesAsync(ct);
        return ToDto(room, racks);
    }

    public async Task<CellarRoomDto> SetDoorAsync(SetDoorRequest request, CancellationToken ct = default)
    {
        var room = await FindRoomAsync(track: true, ct);
        var isNew = room is null;
        room ??= new CellarRoom { OwnerId = user.UserId };
        // A wall outside 0-3 is a bad request (domain error); a door that does not fit its wall is a conflict.
        if (request.Wall is >= 0 and <= 3 && CellarRoom.CheckDoor(request.Wall, request.OffsetCm, room.WidthCm, room.DepthCm) is { } error)
            throw new ConflictException(error);
        room.SetDoor(request.Wall, request.OffsetCm);
        if (isNew) db.CellarRooms.Add(room);
        await db.SaveChangesAsync(ct);
        return ToDto(room, await LoadRacksAsync(ct));
    }

    public async Task<CellarRoomDto> ClearDoorAsync(CancellationToken ct = default)
    {
        var room = await FindRoomAsync(track: true, ct);
        if (room is not null)
        {
            room.ClearDoor();
            await db.SaveChangesAsync(ct);
        }
        return ToDto(room ?? new CellarRoom(), await LoadRacksAsync(ct));
    }

    public async Task<CellarRoomDto> PlaceAsync(Guid rackId, PlaceRackRequest request, CancellationToken ct = default)
    {
        var room = await FindRoomAsync(track: false, ct) ?? new CellarRoom();
        var racks = await LoadRacksAsync(ct);
        var rack = racks.FirstOrDefault(r => r.Id == rackId) ?? throw new NotFoundException("Regal nicht gefunden.");

        rack.Place(request.X, request.Z, request.Rotation, request.ElevationCm);
        // Nothing is saved when the new spot is invalid.
        var error = CellarRoom.CheckHeight(room.HeightCm, rack, rack.ElevationCm)
            ?? CellarRoom.CheckFit(room.WidthCm, room.DepthCm, rack, rack.CurrentFootprint!.Value, racks);
        if (error is not null) throw new ConflictException(error);

        await db.SaveChangesAsync(ct);
        return ToDto(room, racks);
    }

    public async Task<CellarRoomDto> ClearPlacementAsync(Guid rackId, CancellationToken ct = default)
    {
        var room = await FindRoomAsync(track: false, ct) ?? new CellarRoom();
        var racks = await LoadRacksAsync(ct);
        var rack = racks.FirstOrDefault(r => r.Id == rackId) ?? throw new NotFoundException("Regal nicht gefunden.");
        rack.ClearPlacement();
        await db.SaveChangesAsync(ct);
        return ToDto(room, racks);
    }

    /// <summary>Used by <see cref="RackService"/> after a resize: the rack must still fit where it stands.</summary>
    public static async Task EnsureStillFitsAsync(IAppDbContext db, string userId, Rack rack, CancellationToken ct = default)
    {
        if (rack.CurrentFootprint is not { } footprint) return;
        var room = await db.CellarRooms.AsNoTracking().FirstOrDefaultAsync(r => r.OwnerId == userId, ct) ?? new CellarRoom();
        var others = await db.Racks.AsNoTracking()
            .Where(r => r.OwnerId == userId && r.Id != rack.Id).ToListAsync(ct);
        var error = CellarRoom.CheckHeight(room.HeightCm, rack, rack.ElevationCm)
            ?? CellarRoom.CheckFit(room.WidthCm, room.DepthCm, rack, footprint, others);
        if (error is not null)
            throw new ConflictException(error + " Bitte das Regal zuerst im Kellerraum entfernen oder verschieben.");
    }

    private Task<CellarRoom?> FindRoomAsync(bool track, CancellationToken ct)
    {
        var rooms = track ? db.CellarRooms.AsQueryable() : db.CellarRooms.AsNoTracking();
        return rooms.FirstOrDefaultAsync(r => r.OwnerId == user.UserId, ct);
    }

    private Task<List<Rack>> LoadRacksAsync(CancellationToken ct) =>
        db.Racks.Where(r => r.OwnerId == user.UserId)
            .Include(r => r.Slots).ThenInclude(s => s.Wine).ToListAsync(ct);

    private static CellarRoomDto ToDto(CellarRoom room, IEnumerable<Rack> racks) =>
        new(room.WidthCm, room.DepthCm, room.HeightCm,
            racks.OrderBy(r => r.Name, StringComparer.CurrentCultureIgnoreCase)
                .Select(r => new RoomRackDto(
                    r.Id, r.Name, r.Height, r.Width, r.Slots.Count, r.Capacity - r.Slots.Count,
                    r.IsPlaced ? new RackPlacementDto(r.PosX!.Value, r.PosZ!.Value, r.Rotation!.Value, r.ElevationCm) : null,
                    r.Slots.OrderBy(s => s.Row).ThenBy(s => s.Column)
                        .Select(s => new RoomSlotDto(s.Row, s.Column, s.Wine.Type)).ToList()))
                .ToList(),
            room.HasDoor ? new RoomDoorDto(room.DoorWall!.Value, room.DoorOffsetCm!.Value) : null);
}
