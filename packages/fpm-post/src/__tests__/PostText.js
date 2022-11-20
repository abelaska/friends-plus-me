/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import * as text from '../PostText';

test('should fix prof links', t => {
  t.is(
    text.fixProfLinks(
      'Today&#39;s <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23joinindaily">#joinindaily</a> theme from <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/114700151756868523580" oid="114700151756868523580">Johnny Wills</a></span> is &quot;All In Black&quot;. Iași Romania.<br /><br />And taking my cue from <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/106499259257260278261" oid="106499259257260278261">Alun Jones</a></span> :)'
    ),
    'Today&apos;s <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23joinindaily">#joinindaily</a> theme from <a href="https://plus.google.com/114700151756868523580">Johnny Wills</a> is &quot;All In Black&quot;. Ia&#x219;i Romania.<br><br>And taking my cue from <a href="https://plus.google.com/106499259257260278261">Alun Jones</a> :)'
  );
});

test('should fix html lines', t => {
  t.is(
    text.fixHtmlLines(
      'Today&apos;s <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23joinindaily">#joinindaily</a> theme from <a href="https://plus.google.com/114700151756868523580">Johnny Wills</a> is &quot;All In Black&quot;. Ia&#x219;i Romania.<br /><br />And taking my cue from <a href="https://plus.google.com/106499259257260278261">Alun Jones</a> :)'
    ),
    [
      '<p>Today&apos;s <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23joinindaily">#joinindaily</a> theme from <a href="https://plus.google.com/114700151756868523580">Johnny Wills</a> is &quot;All In Black&quot;. Ia&#x219;i Romania.</p>',
      '<p></p>',
      '<p>And taking my cue from <a href="https://plus.google.com/106499259257260278261">Alun Jones</a> :)</p>'
    ].join('')
  );
  t.is(
    text.fixHtmlLines(
      'Today&apos;s <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23joinindaily">#joinindaily</a> theme from <a href="https://plus.google.com/114700151756868523580">Johnny Wills</a> is &quot;All In Black&quot;. Ia&#x219;i Romania.<br><br>And taking my cue from <a href="https://plus.google.com/106499259257260278261">Alun Jones</a> :)'
    ),
    [
      '<p>Today&apos;s <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23joinindaily">#joinindaily</a> theme from <a href="https://plus.google.com/114700151756868523580">Johnny Wills</a> is &quot;All In Black&quot;. Ia&#x219;i Romania.</p>',
      '<p></p>',
      '<p>And taking my cue from <a href="https://plus.google.com/106499259257260278261">Alun Jones</a> :)</p>'
    ].join('')
  );
});
test('should be convert', t => {
  t.is(
    text.htmlToPlain(
      '<span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/118394261350615500974" oid="118394261350615500974">Taya Knight</a></span> &quot;it&quot; being? \ufeff'
    ),
    'Taya Knight "it" being?'
  );
});

test('should be convert entities right', t => {
  // google+ activity z122fzujhwioed5qt04cetgpcvypzfk4hoc0k
  // produced this https://www.facebook.com/KeeHinckley/posts/10159243053640392
  const plain = text.htmlToPlain(
    'Recent evolution: North Ronaldsay sheep have evolved in &lt;180 years to eat exclusively seaweed to the point where a grass diet might kill them by copper poisoning, due to an enormous wall (the Sheepdyke) built around the entire island by their ancestors to exile the sheep onto the beaches away from them. Oh, and winter is actually the best season for them to fatten up. (You would hardly believe this if it were a plot point in <i>Game of Thrones</i>...) <a href="http://www.atlasobscura.com/articles/seaweed-sheep-north-ronaldsay-orkney-festival" class="ot-anchor">http://www.atlasobscura.com/articles/seaweed-sheep-north-ronaldsay-orkney-festival</a> <a href="https://en.wikipedia.org/wiki/North_Ronaldsay_sheep" class="ot-anchor">https://en.wikipedia.org/wiki/North_Ronaldsay_sheep</a><br /><br />&quot;A primitive breed, part of the North European short-tailed sheep group, and smaller than most modern breeds, North Ronaldsay sheep have evolved in isolation since their arrival on the island, possibly as far back as the Iron Age. There are currently around 3,000 on North Ronaldsay, grazing all along the coastline and eating seaweed at low tide. Aside from the Galapagos marine iguana, they are thought to be the only land animals able to survive solely on seaweed. This is not just a quirk, but the result of necessary evolution. In 1832, the island’s laird, or landowner, cleared the land for more valuable cattle and crops. He banished the sheep to 271 acres of shoreline, encircled by a roughly 13-mile-long stone wall known as the sheepdyke. Left with no choice but to adapt to this new stark environment, the sheep survived by feeding on the abundant seaweed they found. They have remained on the sea-facing side of the dyke ever since, fattening up in winter when storms throw plentiful seaweed onto the shore...The dyke is critical to the survival of the breed. The sheep do eat some grass from time to time, but their bodies have so adapted to their seaweed diet that eating too much can cause copper poisoning (seaweed inhibits copper absorption). The dyke keeps them off the grassy fields inland and also prevents gene-pool pollution through crossbreeding with other types of sheep kept on the island. In-breeding, however, has not been a concern because fertile rams tend to cross the clowjoung boundaries to mate, according to Peter Titley, Secretary of the Orkney Sheep Foundation.&quot;'
  );
  t.is(
    plain,
    `Recent evolution: North Ronaldsay sheep have evolved in <180 years to eat exclusively seaweed to the point where a grass diet might kill them by copper poisoning, due to an enormous wall (the Sheepdyke) built around the entire island by their ancestors to exile the sheep onto the beaches away from them. Oh, and winter is actually the best season for them to fatten up. (You would hardly believe this if it were a plot point in Game of Thrones...) http://www.atlasobscura.com/articles/seaweed-sheep-north-ronaldsay-orkney-festival https://en.wikipedia.org/wiki/North_Ronaldsay_sheep

"A primitive breed, part of the North European short-tailed sheep group, and smaller than most modern breeds, North Ronaldsay sheep have evolved in isolation since their arrival on the island, possibly as far back as the Iron Age. There are currently around 3,000 on North Ronaldsay, grazing all along the coastline and eating seaweed at low tide. Aside from the Galapagos marine iguana, they are thought to be the only land animals able to survive solely on seaweed. This is not just a quirk, but the result of necessary evolution. In 1832, the island’s laird, or landowner, cleared the land for more valuable cattle and crops. He banished the sheep to 271 acres of shoreline, encircled by a roughly 13-mile-long stone wall known as the sheepdyke. Left with no choice but to adapt to this new stark environment, the sheep survived by feeding on the abundant seaweed they found. They have remained on the sea-facing side of the dyke ever since, fattening up in winter when storms throw plentiful seaweed onto the shore...The dyke is critical to the survival of the breed. The sheep do eat some grass from time to time, but their bodies have so adapted to their seaweed diet that eating too much can cause copper poisoning (seaweed inhibits copper absorption). The dyke keeps them off the grassy fields inland and also prevents gene-pool pollution through crossbreeding with other types of sheep kept on the island. In-breeding, however, has not been a concern because fertile rams tend to cross the clowjoung boundaries to mate, according to Peter Titley, Secretary of the Orkney Sheep Foundation."`
  );
  t.is(
    text.plainToHtml(plain),
    '<p>Recent evolution: North Ronaldsay sheep have evolved in &lt;180 years to eat exclusively seaweed to the point where a grass diet might kill them by copper poisoning, due to an enormous wall (the Sheepdyke) built around the entire island by their ancestors to exile the sheep onto the beaches away from them. Oh, and winter is actually the best season for them to fatten up. (You would hardly believe this if it were a plot point in Game of Thrones...) http://www.atlasobscura.com/articles/seaweed-sheep-north-ronaldsay-orkney-festival https://en.wikipedia.org/wiki/North_Ronaldsay_sheep</p><p></p><p>&quot;A primitive breed, part of the North European short-tailed sheep group, and smaller than most modern breeds, North Ronaldsay sheep have evolved in isolation since their arrival on the island, possibly as far back as the Iron Age. There are currently around 3,000 on North Ronaldsay, grazing all along the coastline and eating seaweed at low tide. Aside from the Galapagos marine iguana, they are thought to be the only land animals able to survive solely on seaweed. This is not just a quirk, but the result of necessary evolution. In 1832, the island&rsquo;s laird, or landowner, cleared the land for more valuable cattle and crops. He banished the sheep to 271 acres of shoreline, encircled by a roughly 13-mile-long stone wall known as the sheepdyke. Left with no choice but to adapt to this new stark environment, the sheep survived by feeding on the abundant seaweed they found. They have remained on the sea-facing side of the dyke ever since, fattening up in winter when storms throw plentiful seaweed onto the shore...The dyke is critical to the survival of the breed. The sheep do eat some grass from time to time, but their bodies have so adapted to their seaweed diet that eating too much can cause copper poisoning (seaweed inhibits copper absorption). The dyke keeps them off the grassy fields inland and also prevents gene-pool pollution through crossbreeding with other types of sheep kept on the island. In-breeding, however, has not been a concern because fertile rams tend to cross the clowjoung boundaries to mate, according to Peter Titley, Secretary of the Orkney Sheep Foundation.&quot;</p>'
  );
});

test('should be convert entities right #2', t => {
  // https://plus.google.com/+DavidSchmidt/posts/KY9qDBdhsP4 => https://twitter.com/individual8/status/931072745483448321
  t.is(
    text.htmlToPlain(
      'We&#39;re celebrating <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/103320655754019011706" oid="103320655754019011706">Ingress</a></span> fifth birthday this week. <br /><br />Unbelievable, but certainly true, today five years ago I captured and hacked the first portals here in Hamburg. And there were really few back then. What looks like a partly loaded intel map, was indeed the actual number of portals in Hamburg&#39;s city center.<br /><br />I feel slightly nostalgic about that Level 1 and not 100% knowing what I was doing there. What keys were and what I&#39;d use them for.<br /><br />Happy anniversary <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/101002632394819121609" oid="101002632394819121609">Anne Beuttenmüller</a></span> – I believe we became agents the same day.'
    ),
    `We're celebrating Ingress fifth birthday this week. 

Unbelievable, but certainly true, today five years ago I captured and hacked the first portals here in Hamburg. And there were really few back then. What looks like a partly loaded intel map, was indeed the actual number of portals in Hamburg's city center.

I feel slightly nostalgic about that Level 1 and not 100% knowing what I was doing there. What keys were and what I'd use them for.

Happy anniversary Anne Beuttenmüller – I believe we became agents the same day.`
  );
});

test('should check tweet length', t => {
  t.is(text.tweetLength('123'), 3);
});
