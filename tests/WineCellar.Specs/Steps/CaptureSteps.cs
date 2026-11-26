using System.Text;
using Microsoft.EntityFrameworkCore;
using Reqnroll;
using WineCellar.Application;
using WineCellar.Application.Capture;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class CaptureSteps(TestWorld world)
{
    private CaptureDetailDto? _detail;
    private Guid? _oldLabelImageId;
    private Guid? _oldSourceImageId;
    private Guid? _oldPreviewId;
    private string? _annasImageId;
    private string? _annasSourceId;

    private static readonly Dictionary<string, CaptureStatus> Status = new()
    {
        ["wartet"] = CaptureStatus.Pending,
        ["wird recherchiert"] = CaptureStatus.Researching,
        ["fertig"] = CaptureStatus.Ready,
        ["fehlgeschlagen"] = CaptureStatus.Failed,
    };

    // ----- Given: the simulated agent -----

    [Given(@"der Agent erkennt:")]
    public void GivenAgentFinds(Table table)
    {
        var r = world.Agent.Result;
        foreach (var row in table.Rows)
        {
            var source = row["Herkunft"] == "Web" ? FieldSource.Web : FieldSource.Label;
            var value = row["Wert"];
            r = row["Feld"] switch
            {
                "Name" => r with { Name = new(value, source) },
                "Weingut" => r with { Producer = new(value, source) },
                "Jahrgang" => r with { Vintage = new(int.Parse(value), source) },
                "Land" => r with { Country = new(value, source) },
                "Region" => r with { Region = new(value, source) },
                "Barcode" => r with { Barcode = new(value, source) },
                "Trinkreif" => r with
                {
                    DrinkFrom = new(int.Parse(value.Split('-')[0]), source),
                    DrinkUntil = new(int.Parse(value.Split('-')[1]), source),
                },
                "Rebsorten" => r with
                {
                    Grapes = value.Split(',').Select(g =>
                    {
                        var parts = g.Trim().Split(' ');
                        var hasPercent = int.TryParse(parts[^1], out var pct);
                        var name = string.Join(' ', hasPercent ? parts[..^1] : parts);
                        return new ResearchedGrape(name, hasPercent ? pct : null, source);
                    }).ToList(),
                },
                var f => throw new ArgumentException($"Unbekanntes Feld {f}"),
            };
        }
        world.Agent.Result = r;
    }

    [Given(@"der Agent nennt die Quelle ""([^""]*)"" unter ""([^""]*)""")]
    public void GivenSource(string title, string url) =>
        world.Agent.Result = world.Agent.Result with { Sources = [.. world.Agent.Result.Sources, new WebSource(title, url)] };

    [Given(@"der Agent erkennt kein Weinetikett")]
    public void GivenNoLabel() => world.Agent.Result = world.Agent.Result with { IsWineLabel = false };

    [Given(@"der Agent erkennt die Ecken des Etiketts")]
    public void GivenCorners() => world.Agent.Result = world.Agent.Result with { LabelCorners = TestImages.LabelPhoto().Corners };

    [Given(@"der Agent erkennt keine Ecken des Etiketts")]
    public void GivenNoCorners() => world.Agent.Result = world.Agent.Result with { LabelCorners = null };

    [Given(@"der Agent erkennt Ecken außerhalb des Bildes")]
    public void GivenBadCorners() => world.Agent.Result = world.Agent.Result with
    {
        LabelCorners = new LabelCorners(new(-0.2, 0.1), new(0.9, 0.1), new(0.9, 0.9), new(0.1, 1.4)),
    };

    [Given(@"der KI-Dienst ist beim ersten Versuch überlastet")]
    public void GivenTransientOnce() => world.Agent.FailNext(1, transient: true);

    [Given(@"der KI-Dienst ist bei (\d+) Versuchen überlastet")]
    public void GivenTransient(int times) => world.Agent.FailNext(times, transient: true);

    [Given(@"der KI-Dienst lehnt die Anfrage ab")]
    public void GivenPermanent() => world.Agent.FailNext(1, transient: false);

    [Given(@"der Server hat keinen API-Schlüssel für den KI-Dienst")]
    public void GivenNoKey() => world.Availability.IsEnabled = false;

    [Given(@"das Tageslimit ist (\d+) und ich habe heute (\d+) Recherchen gestartet")]
    public async Task GivenUsage(int limit, int used)
    {
        world.CaptureOptions.DailyLimitPerUser = limit;
        world.Db.CaptureUsages.Add(new CaptureUsage
        {
            OwnerId = world.User.UserId,
            Day = DateOnly.FromDateTime(DateTime.Now),
            Count = used,
        });
        await world.Db.SaveChangesAsync();
    }

    // ----- Given/When: capturing -----

    [Given(@"ich habe ein Foto des Etiketts aufgenommen")]
    public async Task GivenCaptured() => await Capture(1, throwOnError: true);

    [Given(@"ich habe ein Foto des Etiketts aufgenommen und (\d+) Flaschen? angegeben")]
    public async Task GivenCapturedWithCount(int count) => await Capture(count, throwOnError: true);

    [Given(@"ich habe (\d+) Fotos aufgenommen")]
    public async Task GivenManyCaptured(int count)
    {
        for (var i = 0; i < count; i++) await Capture(1, throwOnError: true);
    }

    [When(@"ich ein Foto des Etiketts aufnehme und (\d+) Flaschen? angebe")]
    public async Task WhenCapture(int count) => await Capture(count, throwOnError: false);

    [When(@"^ich als Foto (eine Textdatei|ein Bild größer als 10 MB) hochlade$")]
    public async Task WhenUploadInvalid(string kind)
    {
        var data = kind == "eine Textdatei"
            ? Encoding.UTF8.GetBytes("Das ist kein Bild.")
            : [0xFF, 0xD8, 0xFF, .. new byte[StoredImage.MaxBytes]];
        await world.TryAsync(async () => world.LastDraft = await world.Captures.CreateAsync(data, null, 1, null));
    }

    [When(@"ich eine Erfassung ohne Foto starte")]
    public async Task WhenNoPhoto() =>
        await world.TryAsync(async () => world.LastDraft = await world.Captures.CreateAsync(null, null, 1, null));

    [Given(@"die Recherche des Entwurfs läuft")]
    public async Task GivenResearching() => Assert.Equal(world.LastDraft!.Id, await world.Processor.ClaimNextAsync());

    [When(@"der Server neu startet")]
    public async Task WhenRestart() => await world.Processor.ResetInterruptedAsync();

    [Given(@"der Agent hat die Recherche abgeschlossen")]
    [When(@"der Agent die Recherche abschließt")]
    public async Task WhenResearch()
    {
        while (await world.Processor.ClaimNextAsync() is { } id) await world.Processor.ProcessAsync(id);
    }

    [Given(@"für (\d+) davon ist die Recherche fertig")]
    public async Task GivenSomeReady(int count)
    {
        for (var i = 0; i < count; i++)
        {
            var id = await world.Processor.ClaimNextAsync();
            await world.Processor.ProcessAsync(id!.Value);
        }
    }

    [Given(@"ich verwerfe den Entwurf, während recherchiert wird")]
    public void GivenDiscardDuring() =>
        world.Agent.During = async () => await world.Captures.DiscardAsync(world.LastDraft!.Id);

    [When(@"ich ""Erneut recherchieren"" wähle")]
    public async Task WhenRetry() =>
        await world.TryAsync(async () => world.LastDraft = await world.Captures.RetryAsync(world.LastDraft!.Id));

    [When(@"ich den Entwurf öffne")]
    public async Task WhenOpen() => _detail = await world.Captures.GetAsync(world.LastDraft!.Id);

    [When(@"ich Annas Entwurf öffne")]
    public async Task WhenOpenForeign() =>
        await world.TryAsync(async () => await world.Captures.GetAsync(world.LastDraft!.Id));

    [When(@"ich den Entwurf mit Jahrgang (\d+) als neuen Wein speichere")]
    public async Task WhenAcceptCorrected(int vintage) => await AcceptAsNew(vintage);

    [When(@"ich den Entwurf als neuen Wein speichere")]
    public async Task WhenAccept() => await AcceptAsNew(null);

    [When(@"ich die Flaschen zum vorhandenen Wein hinzufüge")]
    public async Task WhenAddToExisting() =>
        await world.Captures.AcceptAsync(world.LastDraft!.Id, new AcceptCaptureRequest(AddToWineId: _detail!.ExistingWine!.Id));

    [When(@"ich den Zuschnitt des Entwurfs anpasse")]
    public async Task WhenAdjustDraft()
    {
        var before = await world.Captures.GetAsync(world.LastDraft!.Id);
        _oldPreviewId = before.Summary.LabelPreviewImageId;
        _detail = await world.Captures.SetLabelCornersAsync(world.LastDraft.Id, Dto(LabelCorners.Centered));
    }

    // ----- Label image of a wine -----

    [Given(@"""([^""]*)"" hat ein Etikettenbild")]
    public async Task GivenLabelImage(string name)
    {
        var (photo, corners) = TestImages.LabelPhoto();
        var wine = await world.LabelImages.SetAsync((await world.FindWineAsync(name)).Id, photo, Dto(corners));
        _oldLabelImageId = wine.LabelImageId;
        _oldSourceImageId = wine.LabelSourceImageId;
        _annasImageId = wine.LabelImageId.ToString();
        _annasSourceId = wine.LabelSourceImageId.ToString();
    }

    [When(@"ich für ""([^""]*)"" ein neues Foto wähle und die Ecken des Etiketts bestätige")]
    public async Task WhenReplace(string name)
    {
        var (photo, corners) = TestImages.Photo(1200, 900,
            new LabelCorners(new(0.3, 0.15), new(0.7, 0.15), new(0.7, 0.85), new(0.3, 0.85)), png: true);
        await world.LabelImages.SetAsync((await world.FindWineAsync(name)).Id, photo, Dto(corners));
    }

    [When(@"ich bei ""([^""]*)"" den Zuschnitt anpasse")]
    public async Task WhenAdjustWine(string name) =>
        await world.LabelImages.SetCornersAsync((await world.FindWineAsync(name)).Id, Dto(LabelCorners.Centered));

    [When(@"ich für ""([^""]*)"" ein Foto mit Ecken außerhalb des Bildes wähle")]
    public async Task WhenBadCornersForWine(string name)
    {
        var (photo, _) = TestImages.LabelPhoto();
        var id = (await world.FindWineAsync(name)).Id;
        await world.TryAsync(async () => await world.LabelImages.SetAsync(id, photo,
            [new(-0.5, 0), new(1, 0), new(1, 1), new(0, 1)]));
    }

    [When(@"ich bei ""([^""]*)"" das Etikettenbild entferne")]
    public async Task WhenRemove(string name) => await world.LabelImages.RemoveAsync((await world.FindWineAsync(name)).Id);

    [When(@"^ich Annas (Etikettenbild|Originalfoto) abrufe$")]
    public async Task WhenGetForeignImage(string which) =>
        await world.TryAsync(async () =>
            await world.Images.GetAsync(Guid.Parse(which == "Etikettenbild" ? _annasImageId! : _annasSourceId!)));

    // ----- Then -----

    [Then(@"entsteht ein Entwurf mit Status ""([^""]*)"" und (\d+) Flaschen")]
    public void ThenDraftCreated(string status, int count)
    {
        Assert.Null(world.LastError);
        Assert.Equal(Status[status], world.LastDraft!.Status);
        Assert.Equal(count, world.LastDraft.BottleCount);
    }

    [Then(@"der Entwurf hat das Foto als Vorschaubild")]
    public async Task ThenThumbnail()
    {
        var image = await world.Images.GetAsync(world.LastDraft!.FrontImageId);
        Assert.Equal("image/jpeg", image.ContentType);
    }

    [Then(@"der Hintergrunddienst wurde geweckt")]
    public void ThenNotified() => Assert.True(world.Queue.Notifications > 0);

    [Then(@"es gibt keinen Entwurf")]
    public async Task ThenNoDraft() => Assert.Empty(await world.Captures.ListAsync());

    [Then(@"ich habe heute (\d+) Recherchen verbraucht")]
    public async Task ThenUsed(int used) => Assert.Equal(used, (await world.Captures.GetQuotaAsync()).Used);

    [Then(@"habe ich heute noch (\d+) Recherchen")]
    public async Task ThenRemaining(int remaining) => Assert.Equal(remaining, (await world.Captures.GetQuotaAsync()).Remaining);

    [Then(@"hat der Entwurf den Status ""([^""]*)""")]
    public async Task ThenStatus(string status) => Assert.Equal(Status[status], (await Detail()).Summary.Status);

    [Then(@"hat der Entwurf den Status ""([^""]*)"" mit dem Hinweis ""([^""]*)""")]
    public async Task ThenStatusWithHint(string status, string hint)
    {
        var d = await Detail();
        Assert.Equal(Status[status], d.Summary.Status);
        Assert.Contains(hint, d.Summary.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Then(@"der Entwurf heißt ""([^""]*)"" mit Jahrgang (\d+)")]
    public async Task ThenNamed(string name, int vintage)
    {
        var s = (await Detail()).Summary;
        Assert.Equal(name, s.Name);
        Assert.Equal(vintage, s.Vintage);
    }

    [Then(@"sind im Entwurf ""([^""]*)"" als ""(Etikett|Web)"" gekennzeichnet")]
    public async Task ThenSources(string fields, string source)
    {
        var d = await Detail();
        var expected = source == "Web" ? FieldSource.Web : FieldSource.Label;
        foreach (var field in fields.Split(',').Select(f => f.Trim()))
        {
            var actual = field switch
            {
                "Name" => d.Name?.Source,
                "Weingut" => d.Producer?.Source,
                "Jahrgang" => d.Vintage?.Source,
                "Trinkreif" => d.DrinkFrom?.Source,
                "Rebsorten" => d.Grapes.Select(g => (FieldSource?)g.Source).FirstOrDefault(),
                _ => throw new ArgumentException(field),
            };
            Assert.Equal(expected, actual);
        }
    }

    [Then(@"der Entwurf nennt die Quelle ""([^""]*)""")]
    public async Task ThenSourceListed(string url) => Assert.Contains((await Detail()).Sources, s => s.Url == url);

    [Then(@"der Entwurf weist darauf hin, dass im Web nichts gefunden wurde")]
    public async Task ThenNothingOnWeb() => Assert.True((await Detail()).NothingFoundOnWeb);

    [When(@"ich ein Foto des Etiketts mit dem Barcode ""([^""]*)"" aufnehme")]
    public async Task WhenCaptureWithBarcode(string barcode)
    {
        var (photo, _) = TestImages.LabelPhoto();
        await world.TryAsync(async () => world.LastDraft = await world.Captures.CreateAsync(photo, null, 1, null, barcode));
    }

    [Then(@"hat der Entwurf den Barcode ""([^""]*)"" vom Etikett")]
    [Then(@"der Entwurf hat den Barcode ""([^""]*)"" vom Etikett")]
    public async Task ThenDraftBarcode(string barcode)
    {
        var d = await Detail();
        Assert.Equal(barcode, d.Barcode?.Value);
        Assert.Equal(FieldSource.Label, d.Barcode?.Source);
    }

    [Then(@"hat der Entwurf keinen Barcode")]
    public async Task ThenNoBarcode() => Assert.Null((await Detail()).Barcode);

    [Then(@"der Agent kannte den Barcode ""([^""]*)""")]
    public void ThenAgentKnew(string barcode) => Assert.Equal(barcode, world.Agent.KnownBarcode);

    [Then(@"der Entwurf hat keinen Jahrgang und keinen Barcode")]
    public async Task ThenCleared()
    {
        var d = await Detail();
        Assert.Null(d.Vintage);
        Assert.Null(d.Barcode);
        Assert.Equal("Hauswein", d.Name?.Value);
    }

    [Then(@"enthält der Entwurf die vier Ecken des Etiketts")]
    public async Task ThenCorners()
    {
        var d = await Detail();
        Assert.True(d.LabelCornersDetected);
        Assert.Equal(4, d.LabelCorners!.Count);
    }

    [Then(@"der Entwurf zeigt ein ausgeschnittenes Etikett im Format 900 × 1200")]
    public async Task ThenPreview()
    {
        var d = await Detail();
        var image = await world.Images.GetAsync(d.Summary.LabelPreviewImageId!.Value);
        using var bitmap = TestImages.Decode(image.Data);
        Assert.Equal((900, 1200), (bitmap.Width, bitmap.Height));
    }

    [Then(@"der Entwurf hat keine Etikett-Ecken und kein ausgeschnittenes Etikett")]
    public async Task ThenNoCorners()
    {
        var d = await Detail();
        Assert.False(d.LabelCornersDetected);
        Assert.Null(d.Summary.LabelPreviewImageId);
    }

    [Then(@"der Agent wurde (\d+)-mal aufgerufen")]
    public void ThenCalls(int calls) => Assert.Equal(calls, world.Agent.Calls);

    [Then(@"zeigt die Navigation bei „Entwürfe“ die Zahl (\d+)")]
    public async Task ThenBadge(int count) => Assert.Equal(count, await world.Captures.CountReadyAsync());

    [Then(@"sehe ich keine Entwürfe")]
    public async Task ThenNoOwnDrafts() => Assert.Empty(await world.Captures.ListAsync());

    [Then(@"schlägt der Entwurf das Land ""([^""]*)"" vor, ohne es zuzuordnen")]
    public void ThenCountrySuggested(string country)
    {
        Assert.Equal(country, _detail!.Country?.Value);
        Assert.Null(_detail.CountryId);
    }

    [Then(@"ordnet der Entwurf das Land ""([^""]*)"" und die Rebsorte ""([^""]*)"" zu")]
    public void ThenMatched(string country, string grape)
    {
        Assert.Equal(world.KnownCountries[country], _detail!.CountryId);
        Assert.Equal(world.KnownGrapes[grape], _detail.Grapes.Single().GrapeId);
    }

    [Then(@"erkennt der Entwurf den vorhandenen Wein ""([^""]*)""")]
    public void ThenExisting(string name) => Assert.Equal(name, _detail!.ExistingWine?.Name);

    [Then(@"der Wein ""([^""]*)"" hat den Jahrgang (\d+)")]
    public async Task ThenVintage(string name, int vintage) => Assert.Equal(vintage, (await world.FindWineAsync(name)).Vintage);

    [Then(@"der Wein ""([^""]*)"" zeigt das ausgeschnittene Etikett als Etikettenbild")]
    public async Task ThenWineLabel(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.NotNull(wine.LabelImageId);
        Assert.NotNull(wine.LabelSourceImageId);
        using var bitmap = TestImages.Decode((await world.Images.GetAsync(wine.LabelImageId!.Value)).Data);
        Assert.Equal((900, 1200), (bitmap.Width, bitmap.Height));
    }

    [Then(@"hat der Wein ""([^""]*)"" kein Etikettenbild, aber das Originalfoto für den Zuschnitt")]
    public async Task ThenOnlySource(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Null(wine.LabelImageId);
        Assert.NotNull(wine.LabelSourceImageId);
    }

    [Then(@"zeigt der Entwurf ein neues ausgeschnittenes Etikett")]
    public void ThenNewPreview()
    {
        Assert.NotNull(_detail!.Summary.LabelPreviewImageId);
        Assert.NotEqual(_oldPreviewId, _detail.Summary.LabelPreviewImageId);
    }

    [Then(@"zeigt ""([^""]*)"" das neu ausgeschnittene Etikett")]
    public async Task ThenNewLabel(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.NotNull(wine.LabelImageId);
        Assert.NotEqual(_oldLabelImageId, wine.LabelImageId);
        using var bitmap = TestImages.Decode((await world.Images.GetAsync(wine.LabelImageId!.Value)).Data);
        Assert.Equal((900, 1200), (bitmap.Width, bitmap.Height));
    }

    [Then(@"das alte Etikettenbild samt Originalfoto ist gelöscht")]
    public async Task ThenOldDeleted()
    {
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldLabelImageId));
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldSourceImageId));
    }

    [Then(@"das Originalfoto von ""([^""]*)"" ist unverändert")]
    public async Task ThenSourceKept(string name) =>
        Assert.Equal(_oldSourceImageId, (await world.FindWineAsync(name)).LabelSourceImageId);

    [Then(@"hat ""([^""]*)"" kein Etikettenbild mehr")]
    public async Task ThenNoLabel(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Null(wine.LabelImageId);
        Assert.Null(wine.LabelSourceImageId);
    }

    [Then(@"es sind keine Bilder mehr gespeichert")]
    public async Task ThenNoImages() => Assert.False(await world.Db.StoredImages.AnyAsync());

    [Then(@"die Foto-Erfassung wird als nicht verfügbar gemeldet")]
    public async Task ThenDisabled() => Assert.False((await world.Captures.GetQuotaAsync()).Enabled);

    // ----- helpers -----

    private async Task Capture(int count, bool throwOnError)
    {
        var (photo, _) = TestImages.LabelPhoto();
        if (throwOnError)
        {
            world.LastDraft = await world.Captures.CreateAsync(photo, null, count, null);
            return;
        }
        await world.TryAsync(async () => world.LastDraft = await world.Captures.CreateAsync(photo, null, count, null));
    }

    private async Task AcceptAsNew(int? vintage)
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        var wine = await world.Wines.CreateAsync(new SaveWineRequest(
            Barcode: null, Name: d.Name!.Value, Vintage: vintage ?? d.Vintage?.Value, Quantity: d.Summary.BottleCount));
        await world.Captures.AcceptAsync(d.Summary.Id, new AcceptCaptureRequest(WineId: wine.Id));
    }

    private Task<CaptureDetailDto> Detail() => world.Captures.GetAsync(world.LastDraft!.Id);

    private static IReadOnlyList<LabelPointDto> Dto(LabelCorners c) => c.Points.Select(p => new LabelPointDto(p.X, p.Y)).ToList();
}
