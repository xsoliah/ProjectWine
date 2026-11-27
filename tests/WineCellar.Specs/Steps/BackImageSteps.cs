using System.Text;
using Microsoft.EntityFrameworkCore;
using Reqnroll;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class BackImageSteps(TestWorld world)
{
    private Guid? _oldBackId;
    private Guid? _draftBackId;
    private Guid? _annasBackId;
    private byte[]? _chosenPhoto;

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
        var wine = await world.BackImages.SetAsync((await world.FindWineAsync(name)).Id, BackPhoto());
        _oldBackId = wine.BackImageId;
        _annasBackId = wine.BackImageId;
    }

    // ----- When -----

    [When(@"ich bei ""([^""]*)"" ein Foto des Rückenetiketts wähle")]
    public async Task WhenAdd(string name)
    {
        _chosenPhoto = BackPhoto();
        await world.BackImages.SetAsync((await world.FindWineAsync(name)).Id, _chosenPhoto);
    }

    [When(@"ich bei ""([^""]*)"" ein neues Foto des Rückenetiketts wähle")]
    public async Task WhenReplace(string name)
    {
        _chosenPhoto = BackPhoto(png: true);
        await world.BackImages.SetAsync((await world.FindWineAsync(name)).Id, _chosenPhoto);
    }

    [When(@"^ich bei ""([^""]*)"" als Rückseite (eine Textdatei|ein Bild größer als 10 MB) wähle$")]
    public async Task WhenInvalid(string name, string kind)
    {
        var data = kind == "eine Textdatei"
            ? Encoding.UTF8.GetBytes("Das ist kein Bild.")
            : [0xFF, 0xD8, 0xFF, .. new byte[StoredImage.MaxBytes]];
        var id = (await world.FindWineAsync(name)).Id;
        await world.TryAsync(async () => await world.BackImages.SetAsync(id, data));
    }

    [When(@"ich bei ""([^""]*)"" das Rückseitenbild entferne")]
    public async Task WhenRemove(string name) =>
        await world.BackImages.RemoveAsync((await world.FindWineAsync(name)).Id);

    [When(@"ich bei ""([^""]*)"" von Anna ein Foto des Rückenetiketts wähle")]
    public async Task WhenForeignWine(string name) =>
        await world.TryAsync(async () => await world.BackImages.SetAsync(world.KnownWines[name], BackPhoto()));

    [When(@"ich Annas Rückseitenbild abrufe")]
    public async Task WhenGetForeign() =>
        await world.TryAsync(async () => await world.Images.GetAsync(_annasBackId!.Value));

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

    [Then(@"ist das Rückseitenbild von ""([^""]*)"" das gewählte Foto")]
    public async Task ThenBackIsChosen(string name)
    {
        var id = (await world.FindWineAsync(name)).BackImageId;
        var image = await world.Images.GetAsync(id!.Value);
        Assert.Equal(_chosenPhoto, image.Data); // stored whole, not cut or re-encoded
    }

    [Then(@"zeigt ""([^""]*)"" das neue Rückseitenbild")]
    public async Task ThenNewBack(string name)
    {
        var id = (await world.FindWineAsync(name)).BackImageId;
        Assert.NotNull(id);
        Assert.NotEqual(_oldBackId, id);
        Assert.Equal(_chosenPhoto, (await world.Images.GetAsync(id.Value)).Data);
    }

    [Then(@"das alte Rückseitenbild ist gelöscht")]
    public async Task ThenOldDeleted() =>
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldBackId));

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

    /// <summary>A photo that differs on every call (different size), so two photos are never byte-identical.</summary>
    private static int _counter;

    private static byte[] BackPhoto(bool png = false)
    {
        var n = Interlocked.Increment(ref _counter);
        var (photo, _) = TestImages.Photo(1000 + n, 800, LabelCorners.Centered, png);
        return photo;
    }
}
