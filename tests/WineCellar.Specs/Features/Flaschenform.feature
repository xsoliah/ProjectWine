# language: de
Funktionalität: Flaschenform eines Weins
  Als Weinsammler möchte ich die Flaschenform meines Weins wählen können, damit Schaumwein, Burgunder und andere
  Flaschen in 3D passend aussehen.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Form wählen und behalten
    Angenommen mein Keller enthält 1 Flasche "Spätburgunder"
    Wenn ich die Flaschenform von "Spätburgunder" auf "Burgundy" setze
    Dann hat "Spätburgunder" die Flaschenform "Burgundy"

  Szenario: Zurück auf automatisch
    Angenommen mein Keller enthält 1 Flasche "Crémant"
    Und ich setze die Flaschenform von "Crémant" auf "Burgundy"
    Wenn ich die Flaschenform von "Crémant" auf automatisch setze
    Dann hat "Crémant" keine gewählte Flaschenform

  Szenario: Wein ohne Angabe hat keine gewählte Form
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Dann hat "Sassicaia" keine gewählte Flaschenform

  Szenario: Ungültige Form
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Wenn ich die Flaschenform von "Sassicaia" auf einen ungültigen Wert setze
    Dann wird die Aktion abgelehnt
