using System.Text;
using Microsoft.EntityFrameworkCore;
using Reqnroll;
using WineCellar.Application;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class BackImageSteps(TestWorld world)
{
    private Guid? _oldBackId;
    private Guid? _oldSourceId;
    private Guid? _draftBackId;
    private Guid? _annasSourceId;
    private Guid? _rawId;

    // ----- Given -----

    [Given(@"ich habe ein Foto des Etiketts und ein Foto des Rückenetiketts aufgenommen")]
    public async Task GivenCapturedWithBack()
    {
        var (front, _) = TestImages.LabelPhoto();
        var back = BackPhoto();
        world.LastDraft = await world.Captures.CreateAsync(front, back, 1, null);
        _draftBackId = (await world.Db.CaptureDrafts.AsNoTracking().SingleAsync(d => d.Id == world.LastDraft.Id)).BackImageId;
        Assert.NotNull(_draftBackId);
    }

    [Given(@"""([^""]*)"" hat ein Rückseitenbild")]
    public async Task GivenBackImage(string name)
    {
        var (photo, corners) = TestImages.LabelPhoto();
        var wine = await world.BackImages.SetAsync((await world.FindWineAsync(name)).Id, photo, Dto(corners));
        _oldBackId = wine.BackImageId;
        _oldSourceId = wine.BackSourceImageId;
        _annasSourceId = wine.BackSourceImageId;
    }

    [Given(@"""([^""]*)"" hat ein unbearbeitetes Rückseitenbild")]
    public async Task GivenRawBackImage(string name)
    {
        var (photo, _) = TestImages.LabelPhoto();
        var image = world.Images.Add(photo);
        var id = (await world.FindWineAsync(name)).Id;
        var wine = await world.Db.Wines.SingleAsync(w => w.Id == id);
        wine.BackImageId = image.Id;
        await world.Db.SaveChangesAsync();
        _rawId = image.Id;
        _oldBackId = image.Id;
    }

    // ----- When -----

    [When(@"ich bei ""([^""]*)"" ein Foto des Rückenetiketts wähle und die Ecken bestätige")]
    public async Task WhenAdd(string name)
    {
        var (photo, corners) = TestImages.LabelPhoto();
        await world.BackImages.SetAsync((await world.FindWineAsync(name)).Id, photo, Dto(corners));
    }

    [When(@"ich bei ""([^""]*)"" ein neues Foto des Rückenetiketts wähle und die Ecken bestätige")]
    public async Task WhenReplace(string name)
    {
        var (photo, corners) = TestImages.Photo(1200, 900,
            new LabelCorners(new(0.3, 0.15), new(0.7, 0.15), new(0.7, 0.85), new(0.3, 0.85)), png: true);
        await world.BackImages.SetAsync((await world.FindWineAsync(name)).Id, photo, Dto(corners));
    }

    [When(@"ich bei ""([^""]*)"" den Zuschnitt der Rückseite anpasse")]
    public async Task WhenAdjust(string name) =>
        await world.BackImages.SetCornersAsync((await world.FindWineAsync(name)).Id, Dto(TestImages.LabelPhoto().Corners));

    [When(@"^ich bei ""([^""]*)"" als Rückseite (eine Textdatei|ein Bild größer als 10 MB) wähle$")]
    public async Task WhenInvalid(string name, string kind)
    {
        var data = kind == "eine Textdatei"
            ? Encoding.UTF8.GetBytes("Das ist kein Bild.")
            : [0xFF, 0xD8, 0xFF, .. new byte[StoredImage.MaxBytes]];
        var id = (await world.FindWineAsync(name)).Id;
        await world.TryAsync(async () => await world.BackImages.SetAsync(id, data, Dto(LabelCorners.Centered)));
    }

    [When(@"ich bei ""([^""]*)"" ein Foto der Rückseite mit Ecken außerhalb des Bildes wähle")]
    public async Task WhenBadCorners(string name)
    {
        var (photo, _) = TestImages.LabelPhoto();
        var id = (await world.FindWineAsync(name)).Id;
        await world.TryAsync(async () => await world.BackImages.SetAsync(id, photo,
            [new(-0.5, 0), new(1, 0), new(1, 1), new(0, 1)]));
    }

    [When(@"ich bei ""([^""]*)"" das Rückseitenbild entferne")]
    public async Task WhenRemove(string name) =>
        await world.BackImages.RemoveAsync((await world.FindWineAsync(name)).Id);

    [When(@"ich bei ""([^""]*)"" von Anna ein Foto des Rückenetiketts wähle und die Ecken bestätige")]
    public async Task WhenForeignWine(string name)
    {
        var (photo, corners) = TestImages.LabelPhoto();
        await world.TryAsync(async () => await world.BackImages.SetAsync(world.KnownWines[name], photo, Dto(corners)));
    }

    [When(@"ich Annas Originalfoto der Rückseite abrufe")]
    public async Task WhenGetForeign() =>
        await world.TryAsync(async () => await world.Images.GetAsync(_annasSourceId!.Value));

    // ----- Then -----

    [Then(@"hat der Wein ""([^""]*)"" ein Rückseitenbild")]
    public async Task ThenHasBack(string name) =>
        Assert.NotNull((await world.FindWineAsync(name)).BackImageId);

    [Then(@"hat der Wein ""([^""]*)"" kein Rückseitenbild")]
    public async Task ThenNoBack(string name) =>
        Assert.Null((await world.FindWineAsync(name)).BackImageId);

    [Then(@"das Rückseitenbild von ""([^""]*)"" ist das Rückenfoto des Entwurfs")]
    public async Task ThenBackIsDraftPhoto(string name) =>
        Assert.Equal(_draftBackId, (await world.FindWineAsync(name)).BackImageId);

    [Then(@"zeigt das Rückseitenbild von ""([^""]*)"" nur das Etikett im Format 900 × 1200")]
    public async Task ThenCut(string name)
    {
        var id = (await world.FindWineAsync(name)).BackImageId;
        Assert.NotNull(id);
        using var bitmap = TestImages.Decode((await world.Images.GetAsync(id!.Value)).Data);
        Assert.Equal((900, 1200), (bitmap.Width, bitmap.Height));
        // Nothing of the green background: check the four corners of the cut image.
        foreach (var (x, y) in new[] { (5, 5), (894, 5), (5, 1194), (894, 1194) })
            Assert.False(TestImages.IsBackground(bitmap.GetPixel(x, y)), $"Hintergrund bei {x},{y}");
    }

    [Then(@"das Originalfoto der Rückseite von ""([^""]*)"" ist gespeichert")]
    public async Task ThenSourceStored(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.NotNull(wine.BackSourceImageId);
        Assert.Equal(4, wine.BackCorners!.Count);
        Assert.True(await world.Db.StoredImages.AnyAsync(i => i.Id == wine.BackSourceImageId));
    }

    [Then(@"das Originalfoto der Rückseite von ""([^""]*)"" ist unverändert")]
    public async Task ThenSourceUnchanged(string name) =>
        Assert.Equal(_oldSourceId, (await world.FindWineAsync(name)).BackSourceImageId);

    [Then(@"das bisherige Rückseitenbild ist jetzt das Originalfoto von ""([^""]*)""")]
    public async Task ThenRawIsSource(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Equal(_rawId, wine.BackSourceImageId);
        Assert.NotEqual(_rawId, wine.BackImageId);
        Assert.True(await world.Db.StoredImages.AnyAsync(i => i.Id == _rawId));
    }

    [Then(@"zeigt ""([^""]*)"" das neue Rückseitenbild")]
    public async Task ThenNewBack(string name)
    {
        var id = (await world.FindWineAsync(name)).BackImageId;
        Assert.NotNull(id);
        Assert.NotEqual(_oldBackId, id);
        using var bitmap = TestImages.Decode((await world.Images.GetAsync(id.Value)).Data);
        Assert.Equal((900, 1200), (bitmap.Width, bitmap.Height));
    }

    [Then(@"das alte Rückseitenbild samt Originalfoto ist gelöscht")]
    public async Task ThenOldDeleted()
    {
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldBackId));
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldSourceId));
    }

    [Then(@"bleibt das bisherige Rückseitenbild von ""([^""]*)"" erhalten")]
    [Then(@"das bisherige Rückseitenbild von ""([^""]*)"" bleibt erhalten")]
    public async Task ThenOldKept(string name)
    {
        Assert.Equal(_oldBackId, (await world.FindWineAsync(name)).BackImageId);
        Assert.True(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldBackId));
    }

    [Then(@"das Rückenfoto des Entwurfs ist gelöscht")]
    public async Task ThenDraftBackDeleted() =>
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _draftBackId));

    // ----- helpers -----

    private static IReadOnlyList<LabelPointDto> Dto(LabelCorners c) => c.Points.Select(p => new LabelPointDto(p.X, p.Y)).ToList();

    /// <summary>A photo that differs on every call (different size), so two photos are never byte-identical.</summary>
    private static int _counter;

    private static byte[] BackPhoto(bool png = false)
    {
        var n = Interlocked.Increment(ref _counter);
        var (photo, _) = TestImages.Photo(1000 + n, 800, LabelCorners.Centered, png);
        return photo;
    }
}
