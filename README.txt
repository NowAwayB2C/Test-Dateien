ZETTELWERK
============

Inhalt
index.html     Website und KI Chat
features.js    Einkaufslisten, Vorräte und Zutatenberechnung
knowledge.js   Datenbank für Rezepte und vergangene Einkaufszettel

Start
Alle drei Dateien im selben Ordner verwenden und über einen statischen
Webhost oder lokalen Webserver öffnen.
Lokal zum Beispiel: python -m http.server 8000
Dann http://localhost:8000 öffnen.

Textdateien direkt und unverändert importieren
Im KI Bereich gibt es die beiden Aktionen:
Rezepte anhängen
Einkaufszettel anhängen

Bei jeder Aktion ist die Kategorie schon festgelegt.
Du kannst mehrere TXT, MD oder CSV Dateien bis 1 MB je Datei auswählen.
Die App schreibt alle Bytes der Originaldatei unverändert in IndexedDB.
Es findet beim Hochladen weder eine KI Anfrage noch eine Umschreibung statt.
Der Dateiname, ein SHA256 Prüfsummenwert und der Originalinhalt bleiben
in der lokalen Datenbank erhalten. Gleiche Originaldateien derselben
Kategorie werden nicht ein zweites Mal importiert.

Vorlagen
Unter „Rezepte“ findest du hochgeladene Rezepte und die bereits vorhandenen
Rezepte aus dem KI Chat. Unter „Vergangene Einkaufszettel“ erscheinen
hochgeladene alte Einkaufsvorlagen.
Jede hochgeladene Originaldatei kann wieder heruntergeladen werden.
Beim Öffnen einer Vorlage wird lokal eine Textvorschau erzeugt.

KI
Nur wenn du eine neue Liste oder ein Rezept planst, sucht Zettelwerk
lokal in der passenden Datenbankkategorie nach ähnlichen Einträgen.
Dann können ausgewählte Textausschnitte dieser Vorlagen an den KI Dienst
Puter übermittelt werden. Beim Hochladen selbst wird nichts übertragen.
Die KI kann weiterhin aktuelle Zutatenmengen und Vorräte berücksichtigen.

Übersicht
Die zwei alten unteren Einzelbereiche wurden zusammengefasst.
Die Vorräte sind weiterhin direkt beim aktuellen Einkaufszettel aufklappbar.
Ein separates Rezeptformular gibt es nicht mehr.

Datenschutz und Grenzen
IndexedDB speichert lokal im jeweiligen Browser und synchronisiert nicht
zwischen Geräten. Bei gelöschten Browserdaten können die Vorlagen verloren
gehen. Die KI Nutzung unterliegt den aktuellen Puter Gratislimits.

Konto und persönliches Profil
Über Anmelden meldest du dich bei Puter an. Der Button wird danach zu Abmelden.
Über Profil kannst du einen persönlichen Freitext zu Familie, Vorlieben,
Portionsgrößen und Unverträglichkeiten speichern. Der Profiltext liegt im
Puter Konto in einem App eigenen privaten Schlüsselspeicher und wird bei
KI Anfragen als Profilkontext übergeben. Abmelden leert das sichtbare Profil.
Bitte keine Passwörter oder anderen Zugangsdaten im Profil speichern.

Wochenpläne
Die KI soll ohne persönliche Vorgaben mit vier Personen rechnen und
bei einer vollständigen Wochenplanung Frühstück, Mittagessen und Abendessen
für alle sieben Tage berücksichtigen. Das ist eine Standardannahme.
Bestehende Vorräte bleiben lokal im aktuellen Browser gespeichert.

Chats
Links steht Chats mit einer eigenen Aktion für einen neuen Chat.
Gespräche werden nach Heute, Gestern, Letzte 7 Tage und Monat gruppiert.
Jedes Gespräch ist unabhängig vom Einkaufszettel gespeichert.
Neue Listen und Rezepte werden im Chat als anklickbare Ergebnisse angezeigt.
Bisherige Chatverläufe werden bei der ersten Nutzung übernommen.
Die Chats liegen derzeit lokal im jeweiligen Browser und sind nicht
automatisch mit dem Puter Konto synchronisiert.

Zutaten
Die vier Bereiche links heißen Chats, Listen, Rezepte und Zutaten.
In Zutaten stehen vorhandene Lebensmittel zuhause mit ihren Mengen.
Die KI pflegt diese Vorräte direkt über den Chat, beispielsweise:
Ich habe noch 250 g Butter und einen Liter Milch zuhause.
Die Vorratsangaben werden automatisch bei Einkaufslisten berücksichtigt.
Für eine reine Vorratsmeldung erstellt die App keine Rezepte oder
zusätzlichen Einkaufsartikel. Die doppelte Vorratsanzeige ist entfernt.
Die bereits lokal gespeicherten Vorräte bleiben erhalten.
