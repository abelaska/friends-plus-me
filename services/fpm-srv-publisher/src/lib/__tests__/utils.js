// eslint-disable-next-line import/no-extraneous-dependencies
const test = require('ava');
const utils = require('../utils');

test('should remove autocomplete with value', t => {
  t.is(
    utils.replaceAutocompletedInputWithValue(
      '<p>Best way to learn something new is to do it. Here&nbsp;<span id="autocomplete"><span id="autocomplete-delimiter">@</span><span id="autocomplete-searchtext"><span class="dummy">upwork shares small hands-on ways to learn to incorporate freelancers into your work #ThinkingIn4T&nbsp; &nbsp;</span></span></span></p>'
    ),
    '<p>Best way to learn something new is to do it. Here&#xA0;@upwork shares small hands-on ways to learn to incorporate freelancers into your work #ThinkingIn4T&#xA0; &#xA0;</p>'
  );
});

test('should remove autocomplete with uid', t => {
  t.is(
    utils.replaceAutocompletedInputWithValue(
      '<p>Suite &agrave; qq avec ses chauffeurs partenaires,&nbsp;<input class="autocompleted autocompleted-person" type="button" value="+Uber" data-uid="1234567890" />&nbsp;publie une update sur sa vision de la s&eacute;curit&eacute; client.&nbsp;</p>'
    ),
    '<p>Suite &#xE0; qq avec ses chauffeurs partenaires,&#xA0;+Uber&#xA0;publie une update sur sa vision de la s&#xE9;curit&#xE9; client.&#xA0;</p>'
  );
});

test('should deformatGoogleHtml', t => {
  t.is(
    utils.deformatGoogleHtml(
      '<p>Teampost</p><p>&nbsp;</p><p>Liebe Fans und Freunde des Verm&auml;chtnis der W&ouml;lfe 😍</p><p>&nbsp;</p><p>Wie in den meisten Kulturen und Religionen Lyrras gibt es nat&uuml;rlich auch in Tyarul um die Zeit der Sonnenwende herum ein Winterfest, zu dessen Anlass auch eifrig die H&auml;user geschm&uuml;ckt werden. Jetzt w&auml;hrend Zaydas Tyrannei sind nat&uuml;rlich viele der Br&auml;uche und Erinnerungen der alten Kulturen verboten, doch die Biluren nachempfundenen Glaskugeln, die einen Gro&szlig;teil des Schmuckes ausmachen, konnten sich in den H&auml;usern halten. Und da sie zuf&auml;lligerweise auch als Weihnachtsbaumkugeln taugen, haben wir uns gedacht, dass wir mal ein paar hierher schmuggeln und euch anbieten!</p><p>&nbsp;</p><p>Diese vier Exemplare sind bereits herangeschafft worden, doch da es eine solch riesige Auswahl gibt, wollten wir erst euch fragen, welche Farben und Gr&ouml;&szlig;en ihr &uuml;berhaupt m&ouml;chtet, und dann schicken wir unseren Schmuggler wieder nach Tyarul, um eure Wunschkugeln zu besorgen! Bei den kleinen Kugeln kriegt er den Preis meist auf umgerechnet 5&euro;, bei den gro&szlig;en auf 6&euro; heruntergehandelt - und bei gr&ouml;&szlig;eren Mengen finden wir sicherlich noch einen g&uuml;nstigeren Preis ;-)</p><p>&nbsp;</p><p>Schreibt einfach hier in die Kommentare oder schickt eine Mail oder eine Nachricht an uns und beschreibt eure Traumkugel (Farbe, Gr&ouml;&szlig;e, Oberfl&auml;che, Drahtfarbe...) m&ouml;glichst genau, und wir suchen nach ihr =)</p><p>&nbsp;</p><p>Farina und Team &lt;3</p>'
    ),
    `Teampost

Liebe Fans und Freunde des Vermächtnis der Wölfe 😍

Wie in den meisten Kulturen und Religionen Lyrras gibt es natürlich auch in Tyarul um die Zeit der Sonnenwende herum ein Winterfest, zu dessen Anlass auch eifrig die Häuser geschmückt werden. Jetzt während Zaydas Tyrannei sind natürlich viele der Bräuche und Erinnerungen der alten Kulturen verboten, doch die Biluren nachempfundenen Glaskugeln, die einen Großteil des Schmuckes ausmachen, konnten sich in den Häusern halten. Und da sie zufälligerweise auch als Weihnachtsbaumkugeln taugen, haben wir uns gedacht, dass wir mal ein paar hierher schmuggeln und euch anbieten!

Diese vier Exemplare sind bereits herangeschafft worden, doch da es eine solch riesige Auswahl gibt, wollten wir erst euch fragen, welche Farben und Größen ihr überhaupt möchtet, und dann schicken wir unseren Schmuggler wieder nach Tyarul, um eure Wunschkugeln zu besorgen! Bei den kleinen Kugeln kriegt er den Preis meist auf umgerechnet 5€, bei den großen auf 6€ heruntergehandelt - und bei größeren Mengen finden wir sicherlich noch einen günstigeren Preis ;-)

Schreibt einfach hier in die Kommentare oder schickt eine Mail oder eine Nachricht an uns und beschreibt eure Traumkugel (Farbe, Größe, Oberfläche, Drahtfarbe...) möglichst genau, und wir suchen nach ihr =)

Farina und Team <3`
  );
});

test('should deformatGoogleHtml #2', t => {
  t.is(
    utils.deformatGoogleHtml(
      utils.replaceAutocompletedInputWithValue(
        utils.replaceAutocompletedInputWithUid(
          '<p>Teampost</p><p>&nbsp;</p><p>Liebe Fans und Freunde des Verm&auml;chtnis der W&ouml;lfe 😍</p><p>&nbsp;</p><p>Wie in den meisten Kulturen und Religionen Lyrras gibt es nat&uuml;rlich auch in Tyarul um die Zeit der Sonnenwende herum ein Winterfest, zu dessen Anlass auch eifrig die H&auml;user geschm&uuml;ckt werden. Jetzt w&auml;hrend Zaydas Tyrannei sind nat&uuml;rlich viele der Br&auml;uche und Erinnerungen der alten Kulturen verboten, doch die Biluren nachempfundenen Glaskugeln, die einen Gro&szlig;teil des Schmuckes ausmachen, konnten sich in den H&auml;usern halten. Und da sie zuf&auml;lligerweise auch als Weihnachtsbaumkugeln taugen, haben wir uns gedacht, dass wir mal ein paar hierher schmuggeln und euch anbieten!</p><p>&nbsp;</p><p>Diese vier Exemplare sind bereits herangeschafft worden, doch da es eine solch riesige Auswahl gibt, wollten wir erst euch fragen, welche Farben und Gr&ouml;&szlig;en ihr &uuml;berhaupt m&ouml;chtet, und dann schicken wir unseren Schmuggler wieder nach Tyarul, um eure Wunschkugeln zu besorgen! Bei den kleinen Kugeln kriegt er den Preis meist auf umgerechnet 5&euro;, bei den gro&szlig;en auf 6&euro; heruntergehandelt - und bei gr&ouml;&szlig;eren Mengen finden wir sicherlich noch einen g&uuml;nstigeren Preis ;-)</p><p>&nbsp;</p><p>Schreibt einfach hier in die Kommentare oder schickt eine Mail oder eine Nachricht an uns und beschreibt eure Traumkugel (Farbe, Gr&ouml;&szlig;e, Oberfl&auml;che, Drahtfarbe...) m&ouml;glichst genau, und wir suchen nach ihr =)</p><p>&nbsp;</p><p>Farina und Team &lt;3</p>',
          '+'
        )
      )
    ),
    `Teampost

Liebe Fans und Freunde des Vermächtnis der Wölfe 😍

Wie in den meisten Kulturen und Religionen Lyrras gibt es natürlich auch in Tyarul um die Zeit der Sonnenwende herum ein Winterfest, zu dessen Anlass auch eifrig die Häuser geschmückt werden. Jetzt während Zaydas Tyrannei sind natürlich viele der Bräuche und Erinnerungen der alten Kulturen verboten, doch die Biluren nachempfundenen Glaskugeln, die einen Großteil des Schmuckes ausmachen, konnten sich in den Häusern halten. Und da sie zufälligerweise auch als Weihnachtsbaumkugeln taugen, haben wir uns gedacht, dass wir mal ein paar hierher schmuggeln und euch anbieten!

Diese vier Exemplare sind bereits herangeschafft worden, doch da es eine solch riesige Auswahl gibt, wollten wir erst euch fragen, welche Farben und Größen ihr überhaupt möchtet, und dann schicken wir unseren Schmuggler wieder nach Tyarul, um eure Wunschkugeln zu besorgen! Bei den kleinen Kugeln kriegt er den Preis meist auf umgerechnet 5€, bei den großen auf 6€ heruntergehandelt - und bei größeren Mengen finden wir sicherlich noch einen günstigeren Preis ;-)

Schreibt einfach hier in die Kommentare oder schickt eine Mail oder eine Nachricht an uns und beschreibt eure Traumkugel (Farbe, Größe, Oberfläche, Drahtfarbe...) möglichst genau, und wir suchen nach ihr =)

Farina und Team <3`
  );
});
