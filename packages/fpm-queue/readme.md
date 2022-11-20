z package.json odstraneno "mongodb-memory-server": "^1.6.5"

// TODO todayPostsLimit, zkontrolovat jestli ve zbyvajicim case do konce dne bude dodrzen
// minimalni interval mezi posty a pripadne podle toho upravit pocet postu, ktery je do konce
// dne mozno naplanovat aby byl intrval mezi posty dodrzen

// Ma byt custom vubec bran v potaz pri balancovani? urcite, jinak by to bylo
// pro uzivatele matouci, kdyby jsme mu v jeden den publikovali 10 postu i kdyz ma
// limit nastaveny jen 5. Publish now a later jsou manualni operace vyjadrujici
// uzivatelovo prani, kdy ma byt konkretni post publikovan, takze by takove posty
// nemeli byt pri balancovani brany v potaz.

// jak zjistim kolik postu uz bylo aktualni den publikovano v pripade, ze
// dochazi k preplanovani? U dnu v budoucnosti je to jednoduche, tam se proste
// naplanuje pocet prispevku podle limitu pro dany den v tydnu.
// Vybalancovani postu pro aktualni den bude vyzadovat zjisteni poctu uspesne
// publikovanych postu v dany den.

// a co s locked posts? brat je jako normalni nelocknuty post, protoze stale
// nevime jestli byl nebo nebyl uspesne publikovany, ale muze byt uspesne publikovan

// kdyz publikovani postu failne tak je preplanovan na jiny cas a oznacen za fixed,
// takze dojde k preplanovani postu a dojde k doplneni dalsiho postu pro dany den,
// pokud nebyl naplnen denni limit.

// _ kdyz se pridava post, tak se preplanovavaji pouze den do ktereho je pridan
// a dny nasledujici
// _ potrebuju vedet u kterych dnu se zmenily posty

// TODO repeating post, kazdy cas kdy se ma post publikovat pocitat do limitu velikosti queue
// TODO opakovani prispevku omezit na max. 1 rok a max. 3x denne, tj. ~1000 vyskytu
// TODO repeating post spada do procesu rebalancovani queue a tudiz pro nej plati
// limit max. poctu prispevku za den, na druhou stranu uzivatel vyzaduje aby byl
// prispevek v dany den publikovan jako v pripade custom casu, takze by se na nej
// denni limit vztahovat nemel, ale i pres to by mel byt dany den publikovan.
// zalezi na tom, jak presne bude moct uzivatel zadefinovat opakovani.
// x every n hours
// x every day at predefined times
// x every week at specific weekdays at predefined times common for all weekdays
// x every week at specific weekdays at predefined times for every weekday separatelly
// x every month n times
// _ every n days => 1 time every n [day]
// _ every week at specific weekdays => 1 time every 1 [mon,tue,wed,thu,fri.sat,sun]
// _ every week n times => n times every 1 [week]
// _ every subset of weekdays n times per day => n times every [mon,tue,wed,thu,fri.sat,sun]
// Kdy maji byt prispevky publikovany je dano schedule dane queue, takze tim by se
// uzivatel nemel zabyvat, kdy bude poprve prispevek publikovan zarizuje rebalancer,
// pripadne sam uzivatel zadefinovanim dne a hodny pro publikovani.

// TODO repeating post, na uzivateli je rict, kolik prispevku ma byt naplanovano (max.
// hodnota bude 1000), pripadne kdy ma byt publikovan prvni prispevek (v tom pripade
// pak prispevky nepodlehaji rebalancingu), a interval pro urceni casoveho rozestupu
// mezi prispevky, ktery pujde definovat jako 1-24 hodin nebo 1-7 dnu nebo 1-53 tydnu
// nebo 1-12 mesicu.
// Mel by jit zadefinovat den pro publikovani prvniho prispevku a tim padem i cas,
// nemusi totiz vzdy jit o aktualni den.
// _ pocet prispevku + posledni den
// _ pocet prispevku + publikacni interval

// Co je pro uzivatele jednodussi definovat
// _ den posledniho prispevku a pocet postu pro naplanovani do daneho casoveho intervalu?
// _ proti: musi se proklikat kalendarem a rozhodnout se pro nejaky posledni den
// _ na tyto prispevky se da uplatit rebalancing
// _ pocet prispevku a casovy rozestup mezi nimi?
// _ pro: UI zobrazuje den kdy bude publikovan posledni prispevek
// _ uzivatel zna presne rozestup mezi prispevky
// \* na tyto prispevky se neda uplatit rebalancing

// repeating post, na uzivateli je rict, den a cas pro publikovani prvniho prispevku
// pripadne muze rict, ze prvni prispevek se ma pridat do fronty jako prvni nebo posledni,
// casovy rozestup mezi prispevky, ktery pujde definovat jako 1-24 hodin nebo 1-7 dnu nebo 1-53 tydnu
// nebo 1-12 mesicu, a den kdy ma byt publikovan posledni prispevek (vyber z kalendare)
// - maximalni pocet opakovani je omezen pouze limitem dane queue
// - tyto prispevky podlehaji rebalancingu, pokud neni cas prvniho prispevku typu custom
// - Repeat every I IU for P PU
// - Repeat every I hours|days|weeks|months for P hours|days|weeks|months
