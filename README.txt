ZETTELWERK
============

Dateien
index.html       Benutzeroberfläche, Einkaufszettel und KI Chat
features.js      Zutaten, Vorräte, Rezepte und Mengenberechnung
knowledge.js     Lokale Datenbank für frühere Einkaufszettel und Rezepte

Start
Alle drei Dateien im selben Ordner lassen.
Für die kostenlose Bereitstellung genügt ein statischer Webhost.
Lokal kann ein Webserver verwendet werden, zum Beispiel:
python -m http.server 8000
Dann im Browser http://localhost:8000 öffnen.

Bedienung
Alle Änderungen an Produkten, Vorräten und Rezepten laufen über den KI Chat.
Frühere Einkaufszettel und Rezepte werden ebenfalls ausschließlich über
den KI Chat eingegeben, zum Beispiel:

Speichere meinen früheren Einkaufszettel: 2 l Milch, 500 g Nudeln.
Merke dir mein Rezept für Kartoffelauflauf für vier Personen: ...

Im Wissensarchiv sind die gespeicherten Inhalte getrennt und lesbar.
Neue Einkaufslisten werden nach Gericht gegliedert. Gemeinsame Zutaten
und vorhandene Vorräte werden zusammengerechnet.
Die Einkaufsliste kann weiterhin abgehakt, gedruckt und als TXT exportiert
werden.

Datenbank
Die Wissensdatenbank ist IndexedDB, gespeichert im aktuell verwendeten
Browser und auf dem aktuellen Gerät. Sie ist keine Cloud Datenbank.
Nur bei entsprechenden Erstellungsanfragen werden passende archivierte
Einträge gesucht und einige ausgewählte Treffer an die KI übergeben.
Bei normalen Anfragen wird nicht das gesamte Archiv übertragen.

Frühere Textbeispiele aus älteren Zettelwerk Versionen werden einmalig
in die neue Datenbank übernommen.

Datenschutz und Kosten
Für eine KI Anfrage erhält Puter die aktuelle Eingabe und die dazu nötigen
Informationen. Die erste Erfassung durch die KI verarbeitet natürlich
ebenfalls den eingegebenen Archivtext.
Ein Puter Konto und Internet sind notwendig. Die App wählt nur explizit
kostenlose Modellvarianten, die Verfügbarkeit ist aber nicht unbegrenzt
garantiert. Es entstehen keine Hostingkosten auf statischen Gratisanbietern.
