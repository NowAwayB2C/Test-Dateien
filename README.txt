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
