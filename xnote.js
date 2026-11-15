// Xarita o‘yini: faqat mavzulashgan testlarda uchraydigan davlatlar; har biriga testlardagi ma’lumotlardan bir nechta qisqa fakt (har safar boshqasi chiqadi)
const XNOTE={
"Vatikan": [
"756-yilda papaning dunyoviy davlati — hozirgi Vatikan vujudga kelgan.",
"756-yili papaning dunyoviy davlati (hozirgi Vatikan) vujudga kelgan."
],
"Buyuk Britaniya": [
"1649-yilda Angliya respublika deb e’lon qilingan.",
"1707-yilda Angliya va Shotlandiya birlashgach, mamlakat «Buyuk Britaniya» deb atala boshlagan.",
"Absolyutizm Angliyada XVI asrda shakllangan.",
"Yevrotunnel Fransiya va Angliyani bog‘lagan.",
"Antanta – Rossiya, Angliya va Fransiya ittifoqi.",
"Daniya qiroli Kanut 1013-yili Angliyani zabt etgan."
],
"Ukraina": [
"1991-yil 24-avgustda mustaqillikni e’lon qilgan; birinchi prezidenti — Leonid Kravchuk.",
"1667-yilgi sulhga ko‘ra chap qirg‘oq Ukraina Kiyev shahri bilan Rossiya tarkibiga kirgan.",
"1991-yil 8-dekabrda Rossiya, Ukraina va Belorussiya rahbarlari SSSR tugatilganini e’lon qilgan.",
"Rossiya va Ukraina o‘rtasida Qora dengiz flotini bo‘lish va Sevastopol maqomi bo‘yicha bahslar bo‘lgan.",
"Gruziya 2009-yilda MDHdan chiqqan; Turkmaniston assotsiatsiyalashgan a’zo; Ukraina faoliyatda qatnashmayapti."
],
"Shvetsiya": [
"XI asrda Daniya qiroli Kanut tuzgan davlat tarkibiga kirgan.",
"XX asrda «skandinav modeli» Shvetsiyada ham amalga oshirilgan.",
"Kanut Angliya bilan birga Shotlandiya, Norvegiya, Shvetsiyani o‘z ichiga olgan davlat tuzgan.",
"1950-yillarda Italiya, Germaniya Federativ Respublikasi, Shvetsiya o‘z “iqtisodiy mo‘jiza”sini namoyish qilgan."
],
"Ispaniya": [
"756-yilda Ispaniyada ilk mustaqil amirlik ajralib chiqqan.",
"1404-yilda Ispaniya elchilari Samarqandda tantanavor qabul qilingan.",
"Ispaniya NATOga faqat 1982-yilda a’zo bo‘lgan.",
"Ilk mustaqil amirlik 756-yili Ispaniyada ajralib chiqqan.",
"Inkvizitsiya faoliyati Ispaniyada ayniqsa keng tus olgan.",
"1982-yil mayda Ispaniya NATOga, 1985-yili YIHga a’zo bo‘lgan."
],
"Slovakiya": [
"Slovaklar g‘arbiy slavyanlarga mansub.",
"1993-yil 1-yanvarda Chexoslovakiya tinch yo‘l bilan bo‘linib, Slovakiya Respublikasi paydo bo‘lgan.",
"1992-yilgi referendumdan so‘ng 1993-yil 1-yanvardan Chexiya va Slovakiya Respublikalari paydo bo‘lgan.",
"Vengriya va Slovakiya kabi davlatlar rahbarlari Rossiya bilan iqtisodiy munosabatlarni tiklash tarafdori bo‘lgan."
],
"Sloveniya": [
"1991–1992-yillarda Yugoslaviya tarkibidan ajralib chiqqan.",
"Sloven – “tushunarli bir xil tilda so‘zlashuvchilar”."
],
"Serbiya": [
"1459-yilda Serbiyaning oxirgi hududi turklar tomonidan ishg‘ol etilgan.",
"1878-yilda Rossiyaga tayanib mustaqilligini e’lon qilgan.",
"1459-yilda Serbiyaning oxirgi hududi ham turklar tomonidan ishg‘ol etilgan.",
"1878-yili Rossiya yordamiga tayangan Serbiya o‘z mustaqilligini e’lon qilgan.",
"Bolgariya, Serbiya va Kiyev Rusida Konstantinopol ta’siri va kirill alifbosi yetakchilik qilgan."
],
"Rossiya": [
"1547-yilda Moskva knyazi Ivan IV podshoh unvonini olgan.",
"Alyaska yarimoroli Rossiyadan sotib olingan.",
"Antanta – Rossiya, Angliya va Fransiya ittifoqi.",
"Moskva knyazi Ivan IV 1547-yilda podshoh unvonini olgan.",
"1383-yilda Moskva knyazligi Vladimir knyazligi bilan birlashgan."
],
"Ruminiya": [
"1989-yil dekabrda Timishoara namoyishi o‘qqa tutilgach qo‘zg‘olon boshlanib, Chaushesku rejimi qulagan.",
"Bir qator davlatlarda ko‘ppartiyali tizim bo‘lsa, Albaniya, Vengriya, Ruminiya va Yugoslaviyada bittadan partiya faoliyat yuritgan.",
"Ruminiyada rejim qo‘zg‘olon va harbiy to‘qnashuv natijasida qulagan; diktator Chaushesku va rafiqasi sud hukmi bilan otib tashlangan.",
"1990-yilda Ruminiya bilan integratsiya jarayonida janubi-sharqdagi rusiyzabon aholi Dnestrbo‘yi Moldaviya Respublikasini e’lon qilgan."
],
"Portugaliya": [
"Qirol Dinish Portugaliya flotiga va Koimbra universitetiga asos solgan.",
"Tarixdagi oxirgi mustamlakachi imperiya — Portugaliya 1975-yilda qulagan.",
"Tarixda oxirgi mustamlakachi imperiya – Portugaliya 1975-yili qulagan.",
"1960-yillar o‘rtalarigacha Portugaliyaning iqtisodiy modeli avtarkiya bo‘lgan."
],
"Polsha": [
"Polsha davlati X asr o‘rtalarida vujudga kelgan; 960–1385-yillarda Piastlar sulolasi boshqargan.",
"Sharqiy Yevropada demokratik o‘zgarishlarni Polsha boshlab bergan.",
"Polsha cherkovi 1000-yili arxiyepiskoplik rutbasini olgan.",
"960–1385-yillarda Polshani Piastlar sulolasi idora qilgan.",
"Polsha, Chexiya, Xorvatiyada Rim ta’siri va lotin yozuvi qaror topgan.",
"Polshada «Birdamlik» faoliyati SSSRdagi «qayta qurish»dan oldin boshlangan."
],
"Norvegiya": [
"XI asrda Daniya qiroli Kanut tuzgan davlat tarkibiga kirgan.",
"«Skandinav modeli» Norvegiyada ham amalga oshirilgan.",
"Kanut Angliya bilan birga Shotlandiya, Norvegiya, Shvetsiyani o‘z ichiga olgan davlat tuzgan."
],
"Niderlandiya": [
"1609-yilda tashkil topgan Niderland Respublikasi Yevropadagi birinchi burjua davlati hisoblanadi.",
"1957-yilda Rim shartnomasini imzolagan oltita davlatdan biri.",
"Ispan qiroli Filipp II Niderlandga inkvizitsiya kiritishga tayyorlangan va qonli siyosat yuritgan.",
"Lola piyozlari uchun odamlar uy-joyini bergan; tarixda “lola talvasasi” nomini olgan bu hodisa Niderlandni inqirozga uchratgan."
],
"Chernogoriya": [
"2006-yilgi referendum natijasida Serbiyadan ajralib chiqqan va Yugoslaviya barham topgan.",
"Urush Serbiya, Chernogoriya, Belgiya kabi ozodlik uchun kurashganlardan tashqari barcha uchun imperialistik urush edi.",
"2006-yilda o‘tkazilgan referendum natijasiga ko‘ra Chernogoriya Serbiyadan ajralib chiqqan va Yugoslaviya barham topgan."
],
"Moldova": [
"1991-yil 27-avgustda mustaqillikni e’lon qilgan; birinchi prezidenti — Mircha Snegur.",
"Moldova agrar-industrial mamlakat; mineral resurslar yo‘q, aholining yarmidan ko‘pi qishloqlarda yashaydi."
],
"Malta": [
"Ioannitlar ordeni Rodos orolidan keyin Maltaga ko‘chgan.",
"Vena kongressi qarori bilan Malta Angliyaga o‘tgan.",
"Orden dastlab Rodos oroliga, bir necha asr o‘tib Maltaga ko‘chgan."
],
"Lyuksemburg": [
"1347-yilda Germaniya imperatorlari taxti Lyuksemburglar sulolasiga o‘tgan.",
"1957-yilda Rim shartnomasini imzolagan oltita davlatdan biri.",
"1273-yilda Rudolf Gabsburg saylangan, 1347-yilda taxt Lyuksemburglarga o‘tgan, 1437-yilda yana Gabsburglar kelgan."
],
"Litva": [
"1404-yilda Litva knyazi Smolenskni qo‘shib olgan.",
"Latviya va Estoniya bilan birga MDH tarkibiga kirmagan.",
"Latviya, Litva va Estoniya MDH tarkibiga kirmagan."
],
"Latviya": [
"Boltiqbo‘yi davlati; Litva va Estoniya bilan birga MDH tarkibiga kirmagan.",
"Latviya, Litva va Estoniya MDH tarkibiga kirmagan."
],
"Estoniya": [
"Boltiqbo‘yi davlati; Latviya va Litva bilan birga MDH tarkibiga kirmagan.",
"Latviya, Litva va Estoniya MDH tarkibiga kirmagan."
],
"Italiya": [
"«Italiya» — «buzoqchalar mamlakati» degani.",
"Gumanizm XIV–XV asrlarda dastlab Italiyada paydo bo‘lgan; Kamillo di Kavur — Italiyaning birinchi bosh vaziri.",
"Rim legioni 407-yilda Italiyaga qaytgan.",
"Fridrix I Italiyaga besh marotaba yurish qilgan.",
"1974-yili Italiyada chuqur iqtisodiy inqiroz boshlangan.",
"Gumanizm dastlab XIV–XV asrlarda Italiyada paydo bo‘lgan."
],
"Irlandiya": [
"Qadimda Irlandiya va Shotlandiyada skott va pikt qabilalari yashagan.",
"XVII asrda Kromvel armiyasi Irlandiyaga bostirib kirgan.",
"Shimolda – hozirgi Irlandiya va Shotlandiyada skott va pikt qabilalari yashagan.",
"Kromvel armiyasi avval Irlandiyaga bostirib kirgan, keyin Shotlandiya mustaqilligini tugatgan."
],
"Vengriya": [
"Avstriya-Vengriya 1867-yilda Avstriya va Vengriya hukmron doiralarining kelishuvi asosida tashkil topgan.",
"1863-yilda Turkistonda bo‘lgan sayyoh Arminiy Vamberi — vengriyalik olim.",
"XII–XIII asrlarda Vengriya, Boltiqbo‘yi, Rus yerlarida yangi shaharlar paydo bo‘lgan.",
"Polsha, Chexoslovakiya, Vengriya jahon siyosiy xaritasida Birinchi jahon urushidan so‘ng paydo bo‘lgan.",
"Avstriya-Vengriya 1867-yili Avstriya va Vengriya hukmron doiralarining kelishuvi asosida tashkil topgan."
],
"Gretsiya": [
"1967-yilda hokimiyatni egallagan harbiylar rejimi «qora polkovniklar» diktaturasi nomini olgan.",
"1981-yilda Yevropa hamjamiyatiga a’zo bo‘lgan.",
"Gretsiya demokratik armiyasi (GDA) SSSR yordamiga tayangan, Gretsiya hukumatini AQSH qo‘llagan.",
"Islohotlar asosan ijobiy natija berib, Gretsiya agrar-industrial mamlakatdan industrial-agrar mamlakatga aylangan.",
"Ispaniya, Portugaliya va Gretsiya XX asr boshiga kelib qudratini yo‘qotib, “Yevropaning chekka hududlari”ga aylangan."
],
"Germaniya": [
"1941-yil 22-iyunda Germaniya SSSRga hujum boshlagan.",
"1990-yilda Gelmut Kol davrida Germaniya birlashgan.",
"Germaniya 1990-yilda Gelmut Kol davrida birlashgan.",
"“Germaniya” asarini Rim tarixchisi Korneliy Tatsit yozgan."
],
"Fransiya": [
"Fransiya toifaviy monarxiyadan mutlaq monarxiyaga aylangan; kalvinizm tarafdorlari gugenotlar deb atalgan.",
"Ikkinchi imperiya 1870-yilgacha yashagan.",
"Yevrotunnel Fransiya va Angliyani bog‘lagan.",
"Antanta – Rossiya, Angliya va Fransiya ittifoqi.",
"Fransiyada kalvinizm tarafdorlari gugenotlar deb atalgan.",
"Kollegiyalar Angliya va Fransiyada kollejlarga asos bo‘lgan."
],
"Finlyandiya": [
"Sovet-Finlyandiya urushida o‘zbekistonlik A.",
"Saidbekov ham qatnashgan.",
"F. Norxo‘jayev Hasan ko‘li bo‘yidagi janglarda, A. Saidbekov Sovet-Finlyandiya urushida qatnashgan."
],
"Daniya": [
"Daniya qiroli Kanut 1013-yilda Angliyani zabt etgan.",
"XX asrda «skandinav modeli» Daniyada ham amalga oshirilgan."
],
"Chexiya": [
"IX asrda hozirgi Chexiya o‘rnida Buyuk Moraviya paydo bo‘lgan; X asr boshida chexlar Chexiya davlatiga asos solgan.",
"XIII asrda Chexiya (Bogemiya) Yevropaning eng kuchli davlatlaridan biri bo‘lgan.",
"XIII asrda Chexiya davlati Bogemiya deb ham atalgan.",
"Chexiyada xristianlik nemis yepiskoplari ta’sirida tarqalgan.",
"XIII asrda Chexiya Yevropaning eng kuchli davlatlaridan biri bo‘lgan.",
"Polsha, Chexiya, Xorvatiyada Rim ta’siri va lotin yozuvi qaror topgan."
],
"Xorvatiya": [
"Xorvatiyada Rim ta’siri va lotin yozuvi qaror topgan.",
"1991–1992-yillarda Yugoslaviyadan ajralib chiqqan.",
"Karlovits sulhi bo‘yicha Turkiya deyarli butun Vengriya, Transilvaniya va Xorvatiyaning katta qismini tark etgan."
],
"Bolgariya": [
"Podsho Simeon (893–927) davrida eng kuchaygan.",
"Asen II davrida Bolgariya gullab-yashnagan va birinchi marta oltin pul zarb qilingan.",
"Bolgariya faqat XII asr so‘ngida mustaqillikka erishgan.",
"XIV asrda Bolgariya Tirnovo, Vidin va Dobruja kabi uchta mustaqil davlatga bo‘lingan.",
"Bolgariya, Serbiya va Kiyev Rusida Konstantinopol ta’siri va kirill alifbosi yetakchilik qilgan."
],
"Bosniya va Gersegovina": [
"1908-yilda Avstriya tomonidan anneksiya qilingan.",
"Aholisi serblardan iborat Bosniya va Gersegovina 1908-yili Avstriya tomonidan anneksiya qilingan."
],
"Belgiya": [
"1957-yil 25-martda Rim shartnomasini imzolagan oltita davlatdan biri."
],
"Belarus": [
"Belaruslar sharqiy slavyanlarga mansub.",
"Mustaqillik kuni — Minskning 1944-yilda ozod qilingan kuni, 3-iyul.",
"Belarus o‘rtacha rivojlangan industrial davlat; qishloq xo‘jaligi va mashinasozlik yaxshi taraqqiy topgan.",
"8-dekabr kuni Minskda Rossiya, Ukraina, Belarus rahbarlari 1922-yilgi Ittifoq shartnomasini bekor qilib, MDH tuzilganini e’lon qilgan."
],
"Avstriya": [
"1815-yilda Rossiya va Prussiya bilan «Muqaddas ittifoq» tuzgan.",
"1908-yilda Bosniya va Gersegovinani anneksiya qilgan.",
"1797-yil oktyabrda Kampo-Formioda Avstriya Fransiya g‘alabasini tan olib, sulh tuzgan.",
"1815-yil 26-sentyabrda Rossiya, Avstriya va Prussiya monarxlari “Muqaddas ittifoq” tuzgan.",
"Aholisi serblardan iborat Bosniya va Gersegovina 1908-yili Avstriya tomonidan anneksiya qilingan."
],
"Albaniya": [
"1992-yilda Albaniya demokratik partiyasi lideri Sali Berisha prezident etib saylangan.",
"1989-yili tuzilgan Albaniya demokratik partiyasi lideri Sali Berisha 1992-yilda prezident etib saylangan.",
"Bir qator davlatlarda ko‘ppartiyali tizim bo‘lsa, Albaniya, Vengriya, Ruminiya va Yugoslaviyada bittadan partiya faoliyat yuritgan.",
"Kommunistlar g‘alabasida (Albaniya va Yugoslaviyadan tashqari) sovet qo‘shinlari va maslahatchilari yordami hal qiluvchi rol o‘ynagan."
],
"Yaman": [
"Arablarda «Yaman» so‘zi «baxtli» ma’nosini bildirgan.",
"Yamandagi Adan shahri savdogarlari bir necha asr ziravorlar savdosini nazorat qilgan.",
"Arablarda Yaman “haq”, “baxtli” ma’nolarini bildirgan.",
"Arabistonning yuksak rivojlangan viloyatlari – Yaman va Xijoz.",
"Yamandagi Adan shahri savdogarlarining karimiylar uyushmasi bir necha asr ziravorlar savdosini nazorat qilgan, XV asrda inqirozga uchragan."
],
"Vyetnam": [
"1973-yilda Vyetnamdagi urush to‘xtatilgan.",
"Bugun sholi eksporti bo‘yicha dunyoda ikkinchi o‘rinda.",
"Vyetnam oziq-ovqat eksporti bo‘yicha Osiyoda birinchi, sholi eksporti bo‘yicha dunyoda ikkinchi o‘rinda.",
"Chinlar Koreya, G‘arbiy va Shimoliy Mo‘g‘uliston, Vyetnam, Koshg‘arni bo‘ysundirgan, Birma vassallikni tan olgan.",
"1973-yili Vyetnamdagi urush to‘xtatilgan; bu Janubi-sharqiy Osiyoda Amerika tajovuzining to‘liq mag‘lubiyatini anglatgan."
],
"O‘zbekiston": [
"O‘zbekistonda hanafiylik mazhabi keng yoyilgan.",
"2020-yilda O‘zbekiston MDH tashkilotiga raislik qilgan."
],
"Birlashgan Arab Amirliklari": [
"1971-yilda ingliz qo‘shinlari chiqib ketgach tuzilgan; federatsiyaga 7 ta amirlik kirgan."
],
"Turkmaniston": [
"Najmiddin Kubro maqbarasi Turkmanistondagi Ko‘hna Urganchda joylashgan.",
"1991-yil 26-oktyabrdagi referendumda aholi mustaqillik uchun ovoz bergan.",
"Gruziya 2009-yilda MDHdan chiqqan; Turkmaniston assotsiatsiyalashgan a’zo; Ukraina faoliyatda qatnashmayapti."
],
"Turkiya": [
"Usmon beyligi Usmonli turk imperiyasining paydo bo‘lishida asosiy rol o‘ynagan.",
"1911–1912-yillarda Turkistondan talabalar Turkiyaga o‘qishga yuborilgan.",
"1911-yilda 15 nafar, 1912-yilda 30 nafar talaba Turkiyaga o‘qishga yuborilgan.",
"Yevropada bu tashkilot “Yosh Turkiya”, a’zolari esa “Yosh turklar” nomini olgan."
],
"Sharqiy Timor": [
"1999-yilgi referendumda aholi mustaqillik uchun ovoz bergan; 2002-yilda BMT nazoratida mustaqil davlatga aylangan."
],
"Tojikiston": [
"1929-yil 16-oktyabrda Tojikiston SSR tuzilib, O‘zSSR tarkibidan chiqqan.",
"1991-yil 9-sentyabrda mustaqillikni e’lon qilgan.",
"Gulxaniy 1770-yilda hozirgi Tojikistonning Tavildara tumanida tug‘ilgan.",
"Baqtriyaliklar Surxon vohasi, shimoliy Afg‘oniston va janubiy Tojikistonda joylashgan.",
"1929-yil 16-oktyabrda Tojikiston ASSR o‘rniga Tojikiston SSR tuzilib, O‘zSSR tarkibidan chiqqan.",
"Tojikiston ASSR O‘zSSR tarkibida, Qoraqalpoq muxtor viloyati Qozog‘iston ASSR tarkibida tuzilgan."
],
"Suriya": [
"1516-yilda Usmoniylar tomonidan bosib olingan."
],
"Janubiy Koreya": [
"«Osiyo yo‘lbarslari»dan biri.",
"1992-yilda Kim Yen Samning saylovdagi g‘alabasi harbiylar boshqaruviga barham bergan.",
"«Osiyo yo‘lbarslari» – Janubiy Koreya, Tayvan, Singapur va Gonkong.",
"Janubiy Koreyada 11 mingdan ortiq o‘zbekistonlik talaba ta’lim olmoqda.",
"Janubiy Koreya YIMi 1962-yildagi 2,3 mlrd dollardan 2023-yilda 1,7 trln dollarga o‘sgan (dunyoda 13-o‘rin).",
"Jahon valyuta fondi va boshqa tashkilotlar Janubiy Koreyaga 50 mlrd dollardan ortiq kredit ajratgan; qarz tez to‘langan."
],
"Singapur": [
"«Osiyo yo‘lbarslari»dan biri; Nyu-York va Londondan keyin uchinchi moliya markaziga aylangan.",
"«Osiyo yo‘lbarslari» – Janubiy Koreya, Tayvan, Singapur va Gonkong.",
"Singapurda ta’limga katta mablag‘ sarflanib, asosiy o‘qish tili deb ingliz tili tanlangan.",
"Sh. Mirziyoyevning 2023-yil yanvardagi Singapurga tashrifi hamkorlikni yanada yuqori darajaga ko‘targan.",
"Singapur neftni qayta ishlash bo‘yicha uchinchi markazga, ikkinchi port shahriga, Nyu-York va Londondan keyin uchinchi moliya markaziga aylangan."
],
"Saudiya Arabistoni": [
"Jahonda aniqlangan neft zaxiralarining chorak qismi Saudiya Arabistonida joylashgan.",
"Jahonda aniqlangan neft zaxiralarining 1/4 qismi Saudiya Arabistonida joylashgan.",
"Ko‘rfaz arab mamlakatlari: Saudiya Arabistoni, BAA, Bahrayn, Qatar, Kuvayt, O‘mon."
],
"Qatar": [
"Ko‘rfaz arab mamlakatlaridan biri; ichimlik suvi dengiz suvini chuchuklashtirish orqali olinadi."
],
"Filippin": [
"Magellan Filippin orollarida mahalliy aholi bilan jangda halok bo‘lgan.",
"Filippin 350 yildan ortiq Ispaniya, 50 yilga yaqin AQSH mustamlakasi bo‘lgan."
],
"Pokiston": [
"1947-yil 15-avgustda Hindiston bilan bir vaqtda tashkil topgan.",
"1966-yilda Toshkentda Hindiston bilan «Toshkent deklaratsiyasi» imzolangan.",
"2025-yil mayda ikki yadroviy davlat – Hindiston va Pokiston o‘rtasida mojaro bo‘lgan.",
"Pokiston gazlamalar, charm mahsulotlar, sport buyumlari, kimyoviy moddalar va gilamlar eksport qiladi."
],
"Shimoliy Koreya": [
"1994-yilgacha Kim Ir Sen, keyin o‘g‘li Kim Chen Ir, 2011-yildan Kim Chen In boshqarib kelmoqda."
],
"Mo‘g‘uliston": [
"Mo‘g‘ullar imperiyasida oliy hukmdor «xoqon» deb atalgan.",
"Amir Temurning Mo‘g‘ulistonga qarshi kurashi 1371–1390-yillarda davom etgan.",
"Mo‘g‘ullar Janubiy Sibir, Manchjuriya va Mo‘g‘ulistonda yashagan.",
"Mo‘g‘uliston taxtidagi oliy hukmdor “xoqon”, uluslardagi xonzodalar “xon” unvoni bilan yuritilgan.",
"Mo‘g‘ulistonning ulug‘ xoqoni Munke soliq va hashar ishlarini tartibga solish to‘g‘risida yorliq chiqargan."
],
"Malayziya": [
"Yangi industrial mamlakatlardan biri; aholisi asosan shofe’iylik mazhabiga amal qiladi."
],
"Livan": [
"Qadimgi Finikiya hozirgi Livan hududida joylashgan.",
"1975–1990-yillarda Livanda fuqarolar urushi bo‘lgan.",
"B. Asad 30 yildan beri Livanda turgan Suriya qo‘shinlarini olib chiqqan.",
"Eron Livandagi «Hizbulloh» va G‘azo sektoridagi «Hamas»ni qo‘llab-quvvatlagan.",
"Finikiya O‘rta Yer dengizining sharqiy qirg‘og‘ida, hozirgi Livan va Suriyaning bir qismida joylashgan."
],
"Laos": [
"Laosda bir partiyali tizim hukmron."
],
"Qirg‘iziston": [
"1991-yil 31-avgustda mustaqillikni e’lon qilgan; birinchi prezidenti — A.",
"Akayev.",
"2005-yilgi «Lolalar inqilobi»dan so‘ng K.",
"Bakiyev hokimiyatga kelgan.",
"Qoraqirg‘iz (Qirg‘iziston) RSFSR tarkibida muxtor viloyat sifatida tuzilgan.",
"Qirg‘iziston oltin qazib chiqarishda MDHda Rossiya va O‘zbekistondan keyin uchinchi o‘ringa chiqqan."
],
"Qozog‘iston": [
"Qozoq xonligiga Girayxon va Jonibekxon asos solgan.",
"1731-yilda Rossiya M.",
"Tevkelevni qozoq xoni Abulxayrxon huzuriga yuborgan.",
"Qozog‘iston iqtisodiyotining asosiy sohalari neft, gaz va metallurgiya bo‘lgan."
],
"Iordaniya": [
"1946-yil 22-martda Transiordaniya mustaqilligi e’lon qilingan; Abdulloh I ibn Husayn podshoh bo‘lgan."
],
"Yaponiya": [
"Minglab orollardan iborat, ulardan to‘rttasi yirik; IV asrda qabilalar ittifoqi shakllangan.",
"Ilk budda tasvirlari Yaponiyaga Koreyadagi Pekche davlati orqali yetib borgan.",
"Yaponiyada IV asrda qabilalar ittifoqi shakllangan.",
"Ilk budda tasvirlari Yaponiyaga Pekche davrida yetib borgan.",
"Pekchelik olim Van In Yaponiya shahzodasiga ustozlik qilgan.",
"Yaponiya minglab orollardan iborat, ulardan to‘rttasi yirik."
],
"Isroil": [
"Mil. avv.",
"XI asrda Falastinda Isroil podsholigi vujudga kelgan.",
"BMT 1948-yilda Falastinda Isroil va Falastin davlatlarini tuzishni tavsiya etgan.",
"AQSH har yili Isroilga 3 mlrd dollar miqdorida beminnat yordam ko‘rsatadi.",
"BMT rezolyutsiyasiga binoan 1948-yil 1-avgustdan Falastinda Isroil va Falastin davlatlarini tuzish tavsiya etilgan.",
"Falastin milliy ma’muriyati tuzilishi uchun Y. Arofat va Isroil bosh vaziri Is’hoq Rabin 1994-yilda Nobel mukofotini olgan."
],
"Iroq": [
"Bag‘dod — «Xudoning in’omi» degani; 1055-yilda Saljuqiylar Bag‘dodni egallagan.",
"G‘azzoliy Bag‘doddagi madrasada dars bergan."
],
"Eron": [
"1256-yilda Tuluyning o‘g‘li Xuloku Eronni bosib olgan.",
"2024-yilda Eron BRIKSga a’zo bo‘lgan.",
"Tuluning o‘g‘li Xuloku 1256-yilda Eronni bosib olgan."
],
"Indoneziya": [
"Mamlakatni 32 yil Suxarto boshqargan.",
"Aholisi asosan shofe’iylik mazhabiga amal qiladi.",
"Min sulolasi davrida Chjan Xe yetti marta dengiz safariga chiqib, Indoneziyadan Arabiston va Sharqiy Afrikagacha borgan."
],
"Hindiston": [
"Mahmud G‘aznaviy Hindistonga 17 marta yurish uyushtirgan.",
"1947-yil 15-avgustda mustaqil davlat tashkil topgan; hukumatni Javoharlal Neru boshqargan.",
"Sholi urug‘i Hindistondan keltirilgan.",
"Xom ipak Qo‘qondan Hindistonga jo‘natilgan.",
"Jaloliddin Shimoliy Hindistonda uch yil hukmronlik qilgan."
],
"Gruziya": [
"1991-yilda Zviad Gamsaxurdiya prezident etib saylangan.",
"2008-yil avgustda Rossiya bilan «Besh kunlik urush» bo‘lgan.",
"Gruziyaning YIga a’zoligi masalasi 2028-yilgacha to‘xtatilgan.",
"1991-yilgi saylovda muxolifat yetakchisi Zviad Gamsaxurdiya Gruziya prezidenti etib saylangan.",
"2008-yil avgustda Janubiy Osetiya va Abxaziya sababli Rossiya-Gruziya «Besh kunlik urushi» bo‘lgan.",
"Gruziya 2009-yilda MDHdan chiqqan; Turkmaniston assotsiatsiyalashgan a’zo; Ukraina faoliyatda qatnashmayapti."
],
"Kipr": [
"XV asrdan Venetsiya tarkibida bo‘lgan.",
"1974-yilda harbiy to‘ntarishdan so‘ng Turkiya orolga qo‘shin kiritgan.",
"Venetsiya tarkibiga Evbeya, Kiklad orollari qismi, Krit va XV asrdan Kipr kirgan.",
"1974-yili harbiylar Kiprda to‘ntarish qilgach, Turkiya orolga qo‘shin kiritgan; bu inqiroz oqibatida xunta ketgan."
],
"Xitoy": [
"Dehqonlar Xuanxe va Yanszini birlashtirgan Buyuk kanalni qurgan.",
"Xubilay — Xitoyni egallagan mo‘g‘ul xoni.",
"Kidariylar Xitoyga elchilar ham yuborgan.",
"Shaharlar Xitoyda imperatorga bo‘ysungan.",
"Xubilay – Xitoyni egallagan mo‘g‘ullar xoni."
],
"Kambodja": [
"1999-yilda ASEANning teng huquqli a’zosi bo‘lgan.",
"1999-yilda Kambodja ASEANning teng huquqli a’zosi bo‘lgan."
],
"Bangladesh": [
"1971-yilda Pokistondan ajralib chiqqan.",
"1951-yili Pokiston mustaqilligini e’lon qilgan, 1956-yilgi konstitutsiya bilan respublika bo‘lgan, 1971-yilda Bangladesh ajralgan."
],
"Bahrayn": [
"30 ta oroldan iborat arxipelagda joylashgan; 1971-yil avgustda mustaqillikka erishgan.",
"Ko‘rfaz arab mamlakatlari: Saudiya Arabistoni, BAA, Bahrayn, Qatar, Kuvayt, O‘mon."
],
"Ozarbayjon": [
"Jaloliddin Manguberdi Ozarbayjonni davlat markazi qilib, Tabrizni poytaxtga aylantirgan.",
"To‘xtamishxon yordamni unutib, 1385-yili Ozarbayjonni egallashga harakat qilgan.",
"Jaloliddin Ozarbayjonni davlat markazi sifatida tanlab, Tabrizni poytaxtga aylantirgan.",
"Ozarbayjon aholisi Jaloliddinda o‘zini gurjilar zo‘ravonligidan ozod etuvchi xaloskorni ko‘rgan."
],
"Armaniston": [
"Qadimgi Urartu davlati hozirgi Armaniston hududida joylashgan.",
"2018-yilgi «Baxmal inqilob»dan so‘ng Nikol Pashinyan hokimiyatga kelgan.",
"Urartu Kavkazortida, hozirgi Turkiyaning sharqiy qismi va Armaniston hududida joylashgan.",
"2025-yil martda Armaniston Rossiya boshchiligidagi Kollektiv xavfsizlik shartnomasi tashkilotiga badal to‘lashdan bosh tortgan."
],
"Afg‘oniston": [
"Bobur 200–300 navkari bilan Afg‘onistonga o‘tib, G‘azna va Kobulni egallagan.",
"2021-yil 31-avgustda AQSH qo‘shinlari Afg‘onistondan olib chiqilgan.",
"Amir Olimxon Afg‘onistonga chekinishga majbur bo‘lgan.",
"Afg‘oniston mustaqilligini saqlab qolgan; Do‘st Muhammad Kobulga qaytgan."
],
"Zimbabve": [
"O‘rta asrlardagi Monomotapa davlatining poytaxti — Buyuk Zimbabve; eng rivojlangan davri XV asr.",
"Monomotapa Zimbabve va Limpopo daryolari bo‘yida bo‘lib, poytaxti Buyuk Zimbabveda 15 ming aholi yashagan; eng rivojlangan davri XV asr."
],
"Gana": [
"Mustamlaka davrida Oltin Qirg‘oq nomi bilan Britaniyaga qaram bo‘lgan."
],
"Chili": [
"Peru, Boliviya va Chilidagi oltin-kumush konlari dunyodagi qimmatbaho metallning yarmini bergan.",
"Neoliberal model Chilida Augusto Pinochet davrida amalga oshirilgan."
],
"Mali": [
"O‘rta asrlarda bu hududda Mali davlati bo‘lgan; poytaxti — Niara."
],
"Tunis": [
"Husayniylar sulolasi Tunisni 1957-yilgacha boshqargan.",
"Milliy-ozodlik harakatiga Habib Burg‘iba boshchilik qilgan.",
"XVIII asr boshida Husayn ibn Ali husayniylar sulolasiga asos solgan; sulola Tunisni 1957-yilgacha boshqargan."
],
"Sudan": [
"Arablar Sahroi Kabir janubidagi yerlarni «Sudan» — «qora tanlilar mamlakati» deb atagan.",
"1820–1822-yillarda Muhammad Ali qo‘shinlari tomonidan zabt etilgan.",
"Sudan mintaqaning eng qoloq mamlakati; sanoatda aholining faqat 5 foizi band.",
"1820–1822-yillarda Sudan Muhammad Ali qo‘shinlari tomonidan zabt etilgan; qul savdosi keskin o‘sgan.",
"Sudan islomiy yo‘lni tanlagan: islom – davlat dini, arab tili – davlat tili, shariat – qonunlar asosi."
],
"Janubiy Afrika Respublikasi": [
"1910-yilda Britaniya dominioni sifatida tuzilgan.",
"Aparteid davrida qora tanlilar saylovlarda qatnasha olmagan."
],
"Somali": [
"1935–1936-yillarda Somalining bir qismi Italiya mustamlakasiga aylantirilgan."
],
"Eritreya": [
"1935–1936-yillarda Efiopiya va Somalining bir qismi bilan birga Italiya mustamlakasiga aylantirilgan."
],
"Ruanda": [
"Tutsi va xutu xalqlari o‘rtasidagi kurash genotsidga olib kelgan; 1 millionga yaqin aholi halok bo‘lgan.",
"Ruandada 1 millionga yaqin aholi halok bo‘lgan; Burundida 1 millionga yaqin kishi qochoqqa aylangan.",
"Ruanda va Burundida tutsi va xutu kurashi genotsidga olib kelgan; Liberiyada 1989-yilda etnik asosdagi fuqarolar urushi boshlangan."
],
"Burundi": [
"Tutsi va xutu kurashi natijasida 1 millionga yaqin kishi qochoqqa aylangan."
],
"Mozambik": [
"Mustamlaka davrida Portugaliya Mozambikdagi ozodlik harakatini bostirgan."
],
"Marokash": [
"Mulay Ismoil mamlakatni 55 yil boshqarib, mustaqillikni saqlashga intilgan.",
"XVI asr oxirida Marokash Songay davlatini bosib olgan.",
"Jazoirda Farhod Abbos, Tunisda Habib Burg‘iba, Marokashda Abdul Karim milliy-ozodlik harakatlariga boshchilik qilgan.",
"Gao atrofida tuzilgan Songay Sunni Ali va Muhammad I davrida rivojlangan, XVI asr oxirida Marokash tomonidan bosib olingan."
],
"Liviya": [
"Liviyada qulo‘g‘lilar hokimiyatini Ahmad Karamanli o‘rnatgan."
],
"Liberiya": [
"1847-yilda tuzilgan; Efiopiya bilan birga Afrikada mustaqilligini saqlab qolgan davlat.",
"Afrikada faqat Liberiya va Efiopiya mustaqilligini saqlab qolgan; Liberiya ozod davlati 1847-yilda tuzilgan.",
"Ruanda va Burundida tutsi va xutu kurashi genotsidga olib kelgan; Liberiyada 1989-yilda etnik asosdagi fuqarolar urushi boshlangan."
],
"Gvineya": [
"Mustamlaka davrida Fransiyaga qaram bo‘lgan."
],
"Efiopiya": [
"Usmoniylar va portugallar hujumlarini qaytargan; hukmdori «negus» deb atalgan.",
"1935–1936-yillarda Italiya mustamlakasiga aylantirilgan.",
"Marksizmga sodiq qolgan Efiopiyadagi Mengistu Xayle Mariam hukumati 1991-yilda ag‘darilgan.",
"Afrikada faqat Liberiya va Efiopiya mustaqilligini saqlab qolgan; Liberiya ozod davlati 1847-yilda tuzilgan.",
"Usmoniylar, dushman qabilalar va portugallar hujumlarini qaytargan yagona davlat Efiopiya; hukmdori “negus” deb atalgan."
],
"Misr": [
"Misr yozuvi 750 iyeroglifdan iborat bo‘lgan.",
"Ahmad al-Farg‘oniy Misrda Nilometr qurgan.",
"Misrni Kir II ning o‘g‘li Kambiz II zabt etgan.",
"Misrliklar yetishtirgan kanopdan gazlama to‘qishgan.",
"Misrliklar alifbosi 750 iyeroglifdan iborat bo‘lgan."
],
"Kongo Demokratik Respublikasi": [
"Mobutu diktaturasi ag‘darilgan; BMT uni dunyoning eng qashshoq mamlakati deb tan olgan."
],
"Jazoir": [
"Milliy-ozodlik harakatiga Farhod Abbos boshchilik qilgan.",
"Mustamlaka davrida Fransiya Jazoirdagi ozodlik harakatini bostirgan."
],
"AQSH": [
"1947-yilda AQSH «Marshall rejasi»ni taklif qilgan.",
"Alyaska yarimoroli Rossiyadan sotib olingan."
],
"Panama": [
"1519-yilda Amerika qit’asida yevropaliklar qurgan birinchi shahar — Panamaga asos solingan.",
"1889-yili AQSH tashabbusi bilan Vashingtonda I Panamerika konferensiyasi chaqirilgan.",
"1519-yili Amerika qit’asida yevropaliklar qurgan birinchi shahar – Panamaga asos solingan.",
"Panamerika siyosati AQSHning G‘arbiy yarimshar mamlakatlari ustidan yagona hukmronligiga qaratilgan."
],
"Nikaragua": [
"1979-yilda diktatura rejimiga qarshi kurash Nikaraguada inqilobga olib kelgan.",
"Diktatorlik rejimlariga qarshi kurash 1979-yili Nikaraguada inqilobga olib kelgan."
],
"Meksika": [
"Mayyalar hozirgi Meksikadagi Yukatan yarimorolida yashagan.",
"1910–1917-yillarda Meksika inqilobi bo‘lib o‘tgan.",
"Meksika inqilobi 1910–1917-yillarda bo‘lib o‘tgan.",
"Mayyalar Markaziy Amerikaning Yukatan yarimorolida (hozirgi Meksika) yashagan.",
"Kasalliklar tufayli Markaziy Meksikada XVI asrda mahalliy aholi soni 10 marta kamaygan.",
"2008-yildan mintaqadagi eng yirik uchta davlat – Braziliya, Meksika va Argentina G20 ga a’zo bo‘lgan."
],
"Gaiti": [
"Gaiti orolidagi fransuz mustamlakasi San-Domingo deb atalgan; u yerda 500 ming qul ishlagan.",
"Gaiti orolidagi fransuz mustamlakasi fransuzcha San-Domingo deb atalgan; u yerda 500 ming qul ishlagan."
],
"Kuba": [
"Kuba rahbari Fidel Kastro 1963-yilda O‘zbekistonga tashrif buyurgan.",
"SSSRning parchalanishi Kuba uchun katta zarba bo‘lgan.",
"SSSRning parchalanishi Kuba uchun juda katta zarba bo‘lgan.",
"Kubada mavsumda qullar sutkasiga 18–20 soat ishlab, ikki marta ovqatlangan."
],
"Kanada": [
"1763-yilda inglizlar fransuzlarni Kanadadan siqib chiqargan.",
"1867-yilda Kanada dominion maqomini olgan.",
"Kanada, Yangi Zelandiya, Avstraliya – dominionlar edi.",
"1763-yili inglizlar fransuzlarni Kanadadan umuman siqib chiqargan."
],
"Peru": [
"Machu-Pikchu — Perudagi inklarning yo‘qolgan shahri.",
"XVI asrda Peru hindulari tog‘li hududda Yangi Ink davlatini tuzgan.",
"XVI asr 30-yillarida Peru hindulari borish qiyin tog‘li hududda Yangi Ink davlatini tuzgan.",
"Peru, Boliviya va Chilidagi oltin-kumush hamda Perudagi mis konlari dunyodagi qimmatbaho metallning yarmini bergan."
],
"Braziliya": [
"1500-yilda Pedro Kabral Braziliyani kashf etgan.",
"1888-yilda qulchilik bekor qilinib, 1891-yilda respublika e’lon qilingan.",
"Vasko da Gama 1498-yilda Hindistonni, Pedro Kabral 1500-yilda Braziliyani kashf etgan.",
"Braziliyada qulchilik 1888-yili bekor qilingan, 1891-yili respublika deb e’lon qilingan.",
"Braziliya, Argentina, Chili avtoritar rejim sharoitida o‘rtacha rivojlanish darajasiga yetgan.",
"2008-yildan mintaqadagi eng yirik uchta davlat – Braziliya, Meksika va Argentina G20 ga a’zo bo‘lgan."
],
"Boliviya": [
"Peru, Boliviya va Chilidagi oltin-kumush konlari dunyodagi qimmatbaho metallning yarmini bergan.",
"Peru, Boliviya va Chilidagi oltin-kumush hamda Perudagi mis konlari dunyodagi qimmatbaho metallning yarmini bergan."
],
"Argentina": [
"1982-yilda Folklend (Malvin) orollari uchun urushda mag‘lub bo‘lgan.",
"2001-yilda jahon tarixidagi eng yirik defoltni e’lon qilgan.",
"2001-yilda defoltni Argentina e’lon qilgan.",
"Braziliya, Argentina, Chili avtoritar rejim sharoitida o‘rtacha rivojlanish darajasiga yetgan.",
"2008-yildan mintaqadagi eng yirik uchta davlat – Braziliya, Meksika va Argentina G20 ga a’zo bo‘lgan.",
"1994-yil dekabrda Meksikada inqiroz boshlangan; 2001-yilda Argentina jahon tarixidagi eng yirik defoltni e’lon qilgan."
],
"Yangi Zelandiya": [
"1642-yilda Abel Tasman kashf etgan; 1840-yilda Britaniya egallagan.",
"Kanada, Yangi Zelandiya, Avstraliya – dominionlar edi.",
"Yevropalik ko‘chmanchilar o‘zlashtirgan Kanada, Avstraliya, Yangi Zelandiya “oq koloniyalar” bo‘lgan.",
"1840-yili Yangi Zelandiya, 1842-yili Borneo orolining shimoli, 1843-yili Janubiy Afrikadagi hududlar egallangan.",
"1605-yili Luis Torres Avstraliyani kashf etgan, 1606-yili Villem Yanszon qirg‘oqlariga kelgan, 1642-yili Abel Tasman Yangi Zelandiyani kashf etgan."
],
"Avstraliya": [
"1605-yilda Luis Torres kashf etgan.",
"Kanada va Yangi Zelandiya bilan birga Britaniya dominioni bo‘lgan.",
"Kanada, Yangi Zelandiya, Avstraliya – dominionlar edi.",
"Yevropalik ko‘chmanchilar o‘zlashtirgan Kanada, Avstraliya, Yangi Zelandiya “oq koloniyalar” bo‘lgan.",
"1605-yili Luis Torres Avstraliyani kashf etgan, 1606-yili Villem Yanszon qirg‘oqlariga kelgan, 1642-yili Abel Tasman Yangi Zelandiyani kashf etgan."
],
"Nepal": [
"Kambodja va Gaiti bilan birga past rivojlangan mamlakatlar guruhiga kiradi."
],
"Mavritaniya": [
"Shimoliy Afrika mamlakatlaridan biri."
],
"Urugvay": [
"Ekvador, Peru, Boliviya, Argentina va Braziliya bilan birga harbiy rejimlar fuqarolik hukumatlari bilan almashtirilgan mamlakatlardan biri."
],
"Ekvador": [
"Peru, Boliviya, Argentina, Braziliya va Urugvay bilan birga harbiy rejimlar fuqarolik hukumatlari bilan almashtirilgan mamlakatlardan biri."
],
"Venesuela": [
"Lotin Amerikasi mamlakati; darslikda Kolumbiya va Braziliya bilan birga taraqqiyot variantlari qiyoslanadi.",
"Venesuela varianti – jangovar, Kolumbiya varianti – do‘stona, Braziliya varianti – pragmatik hamkorlik."
],
"Kolumbiya": [
"Lotin Amerikasi mamlakati; darslikda Venesuela va Braziliya bilan birga taraqqiyot variantlari qiyoslanadi.",
"Kolumb karavellalari “Santa-Mariya”, “Pinta” va “Ninya” deb atalgan.",
"Kolumb 1493–1504-yillar oralig‘ida yana uchta ekspeditsiya uyushtirgan.",
"Kolumb yetib borgan orolni “San Salvador” — “Muqaddas Xaloskor” deb atagan.",
"Kitobdagi Sharq boyliklari genuyalik Xristofor Kolumbda katta taassurot qoldirgan.",
"Venesuela varianti – jangovar, Kolumbiya varianti – do‘stona, Braziliya varianti – pragmatik hamkorlik."
]
};
