// Base de coneixement: Textos en català per nivells
// Cada text té pauses marcades amb || per indicar on el TTS ha de fer pausa llarga

const texts = {
  basic: [
    {
      id: 'b1',
      title: 'El matí',
      text: 'Avui fa un dia molt bonic. || El sol brilla i el cel és blau. || M\'agrada passejar pel parc. || Els ocells canten alegrement. || La natura és meravellosa.',
      description: 'Frases curtes i simples sobre el dia',
    },
    {
      id: 'b2',
      title: 'La família',
      text: 'La meva família és molt gran. || Tinc dos germans i una germana. || Els meus pares es diuen Joan i Maria. || Vivim en una casa al centre de la ciutat. || Els diumenges dinem tots junts.',
      description: 'Vocabulari bàsic de la família',
    },
    {
      id: 'b3',
      title: 'El mercat',
      text: 'Vaig al mercat cada setmana. || Compro fruita fresca i verdures. || La taronja és el meu fruit preferit. || El venedor és molt amable. || Sempre em dona un bon preu.',
      description: 'Vocabulari del mercat i la compra',
    },
    {
      id: 'b4',
      title: 'L\'escola',
      text: 'Els nens van a l\'escola cada dia. || Aprenen a llegir i a escriure. || La mestra explica la lliçó amb paciència. || Al pati juguen amb els amics. || L\'escola és molt important per als infants.',
      description: 'Vocabulari escolar bàsic',
    },
    {
      id: 'b5',
      title: 'El menjar',
      text: 'Per dinar menjo arròs amb verdures. || M\'agrada molt la cuina catalana. || La paella és un plat molt típic. || De postres prenc una peça de fruita. || Bec aigua durant els àpats.',
      description: 'Vocabulari de l\'alimentació',
    },
    {
      id: 'b6',
      title: 'El temps',
      text: 'A l\'hivern fa molt de fred. || De vegades neva a la muntanya. || A l\'estiu el sol escalfa la terra. || A la tardor cauen les fulles dels arbres. || La primavera és l\'estació de les flors.',
      description: 'Les estacions i el temps',
    },
    {
      id: 'b7',
      title: 'La casa',
      text: 'La meva casa té quatre habitacions. || A la cuina hi ha una taula i sis cadires. || Al menjador mirem la televisió tots junts. || El meu germà dorm a l\'habitació petita. || Des del balcó veiem els arbres del carrer.',
      description: 'Vocabulari de la casa',
    },
    {
      id: 'b8',
      title: 'Els animals',
      text: 'El gos és un animal molt fidel. || Els gats dormen moltes hores al dia. || A la granja hi ha vaques, ovelles i gallines. || Els ocells fan el niu als arbres alts. || M\'agrada molt mirar els peixos de colors.',
      description: 'Animals domèstics i de granja',
    },
    {
      id: 'b9',
      title: 'La roba',
      text: 'Avui porto una camisa blanca i uns pantalons blaus. || Quan fa fred em poso el jersei de llana. || Les sabates noves són una mica estretes. || La meva germana té un vestit vermell molt bonic. || A l\'estiu portem roba lleugera i fresca.',
      description: 'Vocabulari de la roba i els colors',
    },
    {
      id: 'b10',
      title: 'El cap de setmana',
      text: 'El dissabte al matí em llevo tard. || Després esmorzo pa amb confitura i un got de llet. || A la tarda vaig al cinema amb els meus amics. || El diumenge fem una excursió a la muntanya. || Al vespre torno a casa una mica cansat.',
      description: 'Rutines i activitats de lleure',
    },
  ],

  intermedi: [
    {
      id: 'i1',
      title: 'Les tradicions catalanes',
      text: 'La Castanyada és una festa molt estimada a Catalunya. || Se celebra la nit del dia 31 d\'octubre. || La gent menja castanyes rostides i panellets. || Els panellets es fan amb marzipà i pinyons. || És una tradició que s\'ha mantingut al llarg dels segles.',
      description: 'Festivitats i tradicions catalanes',
    },
    {
      id: 'i2',
      title: 'El paisatge català',
      text: 'Catalunya és un país de contrastos geogràfics admirables. || Al nord hi ha els alts cims dels Pirineus, coberts de neu a l\'hivern. || A l\'est, la Mediterrània banya les costes amb les seves aigües blaves. || A l\'interior hi ha planes fèrtils on creixen els cereals i la vinya. || Cada comarca té la seva personalitat i el seu caràcter propi.',
      description: 'Descripció geogràfica del país',
    },
    {
      id: 'i3',
      title: 'La llengua catalana',
      text: 'El català és una llengua romànica que prové del llatí vulgar. || Es parla a Catalunya, al País Valencià, a les Illes Balears i a altres territoris. || Té una literatura molt rica que remunta a l\'edat mitjana. || Ramon Llull va ser un dels primers escriptors en llengua catalana. || Avui en dia, el català és parlat per més de deu milions de persones.',
      description: 'Història i extensió de la llengua',
    },
    {
      id: 'i4',
      title: 'La cuina catalana',
      text: 'La cuina catalana és una de les més riques i variades de la Mediterrània. || El pa amb tomàquet és el plat més senzill i popular de tots. || L\'escudella i carn d\'olla és el plat tradicional per excel·lència. || Les postres més conegudes són la crema catalana i els bunyols. || L\'oli d\'oliva és l\'ingredient bàsic de tota la cuina del país.',
      description: 'Gastronomia i receptes catalanes',
    },
    {
      id: 'i5',
      title: 'Barcelona',
      text: 'Barcelona és la capital de Catalunya i una de les ciutats més vibrants d\'Europa. || La seva arquitectura modernista, obra de Gaudí i d\'altres artistes, és coneguda arreu del món. || La Sagrada Família és el monument més visitat de tot Espanya. || El barri Gòtic conserva carrers medievals plens d\'història. || La Barceloneta és la platja urbana més famosa de la Mediterrània.',
      description: 'La capital i els seus monuments',
    },
    {
      id: 'i6',
      title: 'Els castells',
      text: 'Els castells són torres humanes que s\'aixequen a les places dels pobles. || Aquesta tradició va néixer al Camp de Tarragona fa més de dos-cents anys. || La pinya és la base que sosté tot el pes de la construcció. || L\'enxaneta és la criatura que corona el castell i aixeca la mà. || La UNESCO els va declarar Patrimoni Immaterial de la Humanitat l\'any 2010.',
      description: 'Una tradició declarada Patrimoni de la Humanitat',
    },
    {
      id: 'i7',
      title: 'La diada de Sant Jordi',
      text: 'La diada de Sant Jordi se celebra el vint-i-tres d\'abril. || Els carrers s\'omplen de parades de llibres i de roses vermelles. || La llegenda explica que el cavaller va vèncer el drac per salvar la princesa. || De la sang del drac en va néixer un roser. || És una de les festes més estimades del calendari català.',
      description: 'La festa del llibre i la rosa',
    },
    {
      id: 'i8',
      title: 'Les Illes Balears',
      text: 'Les Illes Balears formen un arxipèlag al bell mig de la Mediterrània. || Mallorca és la més gran i la més poblada de totes. || A Menorca s\'hi conserven monuments megalítics de fa milers d\'anys. || Eivissa és coneguda arreu del món per les seves cales d\'aigua transparent. || A totes les illes s\'hi parla català, amb trets dialectals ben característics.',
      description: 'Geografia i llengua de l\'arxipèlag',
    },
    {
      id: 'i9',
      title: 'L\'excursionisme',
      text: 'L\'excursionisme és una activitat molt arrelada al país. || Els centres excursionistes es van fundar a finals del segle dinou. || Caminar per la muntanya permet conèixer el territori i la seva gent. || El Parc Nacional d\'Aigüestortes és un dels espais més visitats del Pirineu. || Cal respectar sempre la natura i endur-se les deixalles a casa.',
      description: 'Muntanya, natura i tradició excursionista',
    },
    {
      id: 'i10',
      title: 'La Fira de Santa Llúcia',
      text: 'La Fira de Santa Llúcia se celebra davant de la catedral de Barcelona. || Va començar l\'any mil set-cents vuitanta-sis i encara continua viva. || A les parades s\'hi venen figures de pessebre, molsa i avets. || El caganer és la figura més sorprenent i divertida de totes. || Els infants hi busquen el tió, una tradició nadalenca ben catalana.',
      description: 'Nadal i tradicions populars',
    },
  ],

  avancat: [
    {
      id: 'a1',
      title: 'Jacint Verdaguer',
      text: 'Jacint Verdaguer i Santaló és considerat el poeta nacional de Catalunya. || Va néixer a Folgueroles el 1845 i va morir a Vallvidriera el 1902. || La seva obra més celebrada és el poema èpic «L\'Atlàntida», publicat el 1877. || «Canigó» és un altre dels seus grans poemes, que canta la natura dels Pirineus. || Verdaguer va contribuir de manera decisiva a la Renaixença, el moviment de recuperació cultural i lingüística del segle XIX.',
      description: 'Biografia del poeta nacional català',
    },
    {
      id: 'a2',
      title: 'El Modernisme català',
      text: 'El Modernisme català va ser un moviment artístic i cultural que va florir entre els anys 1888 i 1911. || Va néixer com una expressió de modernitat i de voluntat d\'europeïtzació de la societat catalana. || En arquitectura, Antoni Gaudí va assolir cotes d\'originalitat mai no vistes, combinant formes orgàniques amb estructures revolucionàries. || Lluís Domènech i Montaner i Josep Puig i Cadafalch van ser els altres grans mestres del Modernisme arquitectònic. || La burgesia catalana va impulsar i finançar aquest moviment com a senyal d\'identitat nacional i d\'estatus social.',
      description: 'Moviment cultural i arquitectònic del segle XIX-XX',
    },
    {
      id: 'a3',
      title: 'La Guerra Civil a Catalunya',
      text: 'La Guerra Civil espanyola, que va esclatar el juliol de 1936, va tenir a Catalunya unes característiques singulars. || La resistència al cop d\'estat feixista va ser exitosa a Barcelona gràcies a la mobilització obrera i als cossos de seguretat lleials a la República. || Durant els primers mesos, a la rereguarda es va viure una autèntica revolució social impulsada pels anarquistes de la CNT i la FAI. || La caiguda de Barcelona el 26 de gener de 1939 va significar l\'inici d\'una llarga repressió contra la cultura i la llengua catalanes. || Centenars de milers de catalans van haver de marxar a l\'exili, on molts van continuar la resistència cultural i política.',
      description: 'La Guerra Civil i les seves conseqüències per Catalunya',
    },
    {
      id: 'a4',
      title: 'La Renaixença',
      text: 'La Renaixença va ser el moviment cultural que, a partir de la primera meitat del segle XIX, va reivindicar la llengua i la cultura catalanes. || Va sorgir com a resposta al llarg període de decadència literària iniciat el segle XVII. || L\'Oda a la Pàtria, de Bonaventura Carles Aribau, publicada el 1833, és considerada el text fundacional del moviment. || Els Jocs Florals, recuperats el 1859, van ser el gran certamen literari que va impulsar la producció poètica en català. || La Renaixença va donar pas, a finals del segle, al Modernisme i al Noucentisme.',
      description: 'El moviment de recuperació cultural del segle XIX',
    },
    {
      id: 'a5',
      title: 'El Cant dels Ocells',
      text: 'El Cant dels Ocells és una cançó popular catalana d\'origen medieval que ha esdevingut un himne identitari. || La melodia, de caràcter contemplatiu i solemne, evoca el cant dels ocells que saludaven el naixement de Jesús. || El violoncel·lista Pau Casals la va convertir en el seu himne personal i la tocava en tots els concerts. || Casals, exiliat a Prada de Conflent per no acceptar el franquisme, la va tocar a les Nacions Unides el 1971 com a cant per la pau. || Aquella actuació va emocionar el món i va convertir la peça en un símbol universal de pau i de resistència cultural.',
      description: 'Cançó popular i el seu significat com a símbol nacional',
    },
    {
      id: 'a6',
      title: 'Mercè Rodoreda',
      text: 'Mercè Rodoreda és una de les novel·listes més importants de la literatura catalana del segle XX. || Va néixer a Barcelona l\'any 1908 i va morir a Girona el 1983. || «La plaça del Diamant», publicada el 1962, és considerada la seva obra mestra. || La novel·la narra la vida de la Natàlia, una dona del barri de Gràcia, abans i després de la guerra. || L\'exili a França i a Suïssa va marcar profundament tota la seva producció literària.',
      description: 'La novel·lista i la seva obra mestra',
    },
    {
      id: 'a7',
      title: 'Pompeu Fabra',
      text: 'Pompeu Fabra va ser l\'enginyer i gramàtic que va normativitzar la llengua catalana moderna. || L\'any 1913 l\'Institut d\'Estudis Catalans va publicar les Normes ortogràfiques, obra seva. || El Diccionari general de la llengua catalana, de 1932, va fixar el lèxic normatiu durant dècades. || La seva feina va donar al català una ortografia coherent i acceptada arreu del domini lingüístic. || Va morir exiliat a Prada de Conflent l\'any 1948, sense poder tornar mai més al país.',
      description: 'El gramàtic que va fixar la normativa',
    },
    {
      id: 'a8',
      title: 'El Noucentisme',
      text: 'El Noucentisme va ser el moviment cultural que va substituir el Modernisme a partir de 1906. || Eugeni d\'Ors en va ser l\'ideòleg principal, a través del seu «Glosari» a La Veu de Catalunya. || Enfront de l\'exuberància modernista, proposava l\'ordre, la mesura i el classicisme mediterrani. || La Mancomunitat de Catalunya, presidida per Prat de la Riba, en va ser l\'instrument institucional. || Biblioteques, escoles i carreteres van ser les eines d\'aquell projecte de modernització del país.',
      description: 'Ordre i classicisme després del Modernisme',
    },
    {
      id: 'a9',
      title: 'Joan Miró',
      text: 'Joan Miró és un dels artistes catalans més universals del segle XX. || Va néixer a Barcelona el 1893 i va morir a Palma el 1983. || El seu llenguatge plàstic, ple d\'estrelles, ocells i taques de color, va influir el surrealisme. || El mas familiar de Mont-roig del Camp va ser una font d\'inspiració constant al llarg de la seva vida. || La Fundació Joan Miró de Montjuïc conserva i difon avui bona part del seu llegat.',
      description: 'El pintor i el seu llenguatge plàstic',
    },
    {
      id: 'a10',
      title: 'La Nova Cançó',
      text: 'La Nova Cançó va ser el moviment musical que, als anys seixanta, va reivindicar el català sota la dictadura. || El col·lectiu dels Setze Jutges va aplegar cantautors com Raimon, Maria del Mar Bonet i Lluís Llach. || «Al vent», de Raimon, es va convertir en un crit de llibertat per a tota una generació. || «L\'estaca», de Llach, va traspassar fronteres i encara avui se\'n canten versions arreu del món. || Aquells cantants van demostrar que la llengua podia ser també un instrument de resistència política.',
      description: 'Música i resistència cultural',
    },
  ],
};

module.exports = texts;
