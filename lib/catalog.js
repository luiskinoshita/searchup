// Catálogo de categorias → subcategorias (os "subtítulos" da busca).
// kw    = palavra em japonês usada no Rakuten (lojas online)
// store = o que procurar no Google Maps (lojas físicas)
// aliases = jeitos que o aluno pode escrever (português, inglês ou japonês)
// Para adicionar algo novo, é só copiar uma linha e trocar os textos.

export const CATALOG = [
  {
    key: 'brinquedos', label: 'Brinquedos', store: 'おもちゃ屋',
    aliases: ['brinquedo', 'brinquedos', 'toy', 'toys', 'おもちゃ', '玩具'],
    subs: [
      { label: 'Carrinhos e miniaturas', kw: 'ミニカー', store: 'ミニカー', aliases: ['carro de brinquedo', 'carrinho', 'carrinho de brinquedo', 'miniatura', 'miniaturas de carro', 'mini car', 'diecast', 'ミニカー'] },
      { label: 'Tomica', kw: 'トミカ', store: 'トミカ', aliases: ['tomica', 'トミカ'] },
      { label: 'Hot Wheels', kw: 'ホットウィール', store: 'ホットウィール', aliases: ['hot wheels', 'hotwheels'] },
      { label: 'Lego', kw: 'レゴ', store: 'レゴ', aliases: ['lego', 'レゴ'] },
      { label: 'Gunpla e kits de montar', kw: 'ガンプラ', store: 'プラモデル', aliases: ['gunpla', 'gundam', 'kit de montar', 'model kit', 'plastimodelismo', 'plamo', 'ガンプラ', 'プラモデル'] },
      { label: 'Bonecos e action figures', kw: 'アクションフィギュア', store: 'フィギュア', aliases: ['boneco', 'action figure', 'bonecos'] },
      { label: 'Pelúcias', kw: 'ぬいぐるみ', store: 'ぬいぐるみ', aliases: ['pelucia', 'bicho de pelucia', 'plush', 'ぬいぐるみ'] },
      { label: 'Radiocontrole', kw: 'ラジコン', store: 'ラジコン', aliases: ['carro de controle remoto', 'controle remoto', 'radiocontrole', 'rc', 'ラジコン'] },
      { label: 'Beyblade', kw: 'ベイブレード', store: 'ベイブレード', aliases: ['beyblade', 'ベイブレード'] },
      { label: 'Sylvanian Families', kw: 'シルバニアファミリー', store: 'シルバニアファミリー', aliases: ['sylvanian', 'sylvanian families'] },
      { label: 'Bonecas', kw: '着せ替え人形', store: 'おもちゃ屋', aliases: ['boneca', 'bonecas', 'licca', 'リカちゃん'] },
      { label: 'Gashapon / cápsulas', kw: 'カプセルトイ', store: 'ガチャガチャ', aliases: ['gashapon', 'gacha', 'capsula', 'ガチャガチャ', 'ガチャ'] },
    ],
  },
  {
    key: 'cartas', label: 'Cartas (TCG)', store: 'トレカショップ',
    aliases: ['carta', 'cartas', 'card', 'cards', 'tcg', 'trading card', 'card game', 'トレカ', 'トレーディングカード'],
    subs: [
      { label: 'Pokémon', kw: 'ポケモンカード BOX', store: 'ポケモンカード', aliases: ['pokemon', 'pokemon card', 'cartas pokemon', 'carta pokemon', 'pokemon box', 'ポケカ', 'ポケモンカード'] },
      { label: 'One Piece', kw: 'ワンピースカード BOX', store: 'ワンピースカード', aliases: ['one piece card', 'cartas one piece', 'carta one piece', 'ワンピースカード'] },
      { label: 'Yu-Gi-Oh!', kw: '遊戯王 BOX', store: '遊戯王', aliases: ['yugioh', 'yu gi oh', 'yu-gi-oh', '遊戯王'] },
      { label: 'Dragon Ball', kw: 'ドラゴンボール カードゲーム', store: 'トレカショップ', aliases: ['dragon ball card', 'cartas dragon ball', 'fusion world'] },
      { label: 'Duel Masters', kw: 'デュエルマスターズ', store: 'デュエルマスターズ', aliases: ['duel masters', 'デュエマ'] },
      { label: 'Union Arena', kw: 'ユニオンアリーナ', store: 'トレカショップ', aliases: ['union arena'] },
      { label: 'Weiss Schwarz', kw: 'ヴァイスシュヴァルツ', store: 'トレカショップ', aliases: ['weiss schwarz', 'weiss'] },
      { label: 'Magic: The Gathering', kw: 'MTG マジック', store: 'MTG', aliases: ['magic', 'mtg', 'magic the gathering'] },
      { label: 'Lorcana', kw: 'ロルカナ', store: 'トレカショップ', aliases: ['lorcana'] },
      { label: 'Sleeves e acessórios', kw: 'カードスリーブ', store: 'トレカショップ', aliases: ['sleeve', 'sleeves', 'protetor de carta', 'deck box', 'スリーブ'] },
    ],
  },
  {
    key: 'tenis', label: 'Tênis e moda', store: 'スニーカーショップ',
    aliases: ['tenis', 'sapato', 'sapatos', 'sneaker', 'sneakers', 'calcado', 'roupa', 'roupas', 'moda', 'スニーカー', 'ファッション'],
    subs: [
      { label: 'Nike', kw: 'ナイキ スニーカー', store: 'ナイキ', aliases: ['nike', 'tenis nike', 'ナイキ'] },
      { label: 'Air Jordan', kw: 'エアジョーダン', store: 'スニーカーショップ', aliases: ['jordan', 'air jordan', 'エアジョーダン'] },
      { label: 'Nike Dunk', kw: 'ナイキ ダンク', store: 'スニーカーショップ', aliases: ['dunk', 'nike dunk', 'dunk low'] },
      { label: 'Adidas', kw: 'アディダス スニーカー', store: 'アディダス', aliases: ['adidas', 'tenis adidas', 'アディダス'] },
      { label: 'New Balance', kw: 'ニューバランス スニーカー', store: 'ニューバランス', aliases: ['new balance', 'ニューバランス'] },
      { label: 'Asics', kw: 'アシックス スニーカー', store: 'アシックス', aliases: ['asics', 'アシックス'] },
      { label: 'Onitsuka Tiger', kw: 'オニツカタイガー', store: 'オニツカタイガー', aliases: ['onitsuka', 'onitsuka tiger', 'オニツカタイガー'] },
      { label: 'Converse', kw: 'コンバース スニーカー', store: 'コンバース', aliases: ['converse', 'all star', 'コンバース'] },
      { label: 'Salomon', kw: 'サロモン スニーカー', store: 'サロモン', aliases: ['salomon'] },
      { label: 'The North Face', kw: 'ノースフェイス', store: 'ノースフェイス', aliases: ['north face', 'the north face', 'tnf', 'ノースフェイス'] },
      { label: 'Supreme', kw: 'シュプリーム', store: 'シュプリーム', aliases: ['supreme'] },
      { label: 'Uniqlo', kw: 'ユニクロ', store: 'ユニクロ', aliases: ['uniqlo', 'ユニクロ'] },
    ],
  },
  {
    key: 'maquiagem', label: 'Maquiagem e beleza', store: 'コスメ',
    aliases: ['maquiagem', 'make', 'makeup', 'make up', 'cosmetico', 'cosmeticos', 'beleza', 'skincare', 'skin care', 'cuidados com a pele', 'コスメ', '化粧品', 'メイク'],
    subs: [
      { label: 'Dior', kw: 'ディオール コスメ', store: 'ディオール', aliases: ['dior', 'maquiagem dior', 'ディオール'] },
      { label: 'Chanel', kw: 'シャネル コスメ', store: 'シャネル', aliases: ['chanel', 'maquiagem chanel', 'シャネル'] },
      { label: 'Yves Saint Laurent', kw: 'イヴサンローラン コスメ', store: 'イヴサンローラン', aliases: ['ysl', 'yves saint laurent', 'saint laurent'] },
      { label: 'Lancôme', kw: 'ランコム', store: 'ランコム', aliases: ['lancome', 'ランコム'] },
      { label: 'Estée Lauder', kw: 'エスティローダー', store: 'エスティローダー', aliases: ['estee lauder', 'estee'] },
      { label: 'Shiseido', kw: '資生堂', store: '資生堂', aliases: ['shiseido', '資生堂'] },
      { label: 'SK-II', kw: 'SK-II', store: 'SK-II', aliases: ['sk2', 'sk-ii', 'sk ii', 'skii'] },
      { label: 'Clé de Peau', kw: 'クレドポーボーテ', store: 'クレドポーボーテ', aliases: ['cle de peau', 'cle de peau beaute', 'cpb'] },
      { label: 'Decorté', kw: 'コスメデコルテ', store: 'コスメデコルテ', aliases: ['decorte', 'cosme decorte', 'kose'] },
      { label: 'Canmake e marcas de drogaria', kw: 'キャンメイク', store: 'ドラッグストア', aliases: ['canmake', 'cezanne', 'キャンメイク', 'プチプラコスメ'] },
      { label: 'Batom', kw: '口紅', store: 'コスメ', aliases: ['batom', 'batons', 'lip', 'lipstick', 'gloss', '口紅', 'リップ'] },
      { label: 'Base', kw: 'ファンデーション', store: 'コスメ', aliases: ['base', 'base de maquiagem', 'foundation', 'ファンデーション'] },
      { label: 'Sombra', kw: 'アイシャドウ', store: 'コスメ', aliases: ['sombra', 'eyeshadow', 'paleta de sombra', 'アイシャドウ'] },
      { label: 'Rímel', kw: 'マスカラ', store: 'コスメ', aliases: ['rimel', 'mascara de cilios', 'mascara', 'マスカラ'] },
      { label: 'Protetor solar', kw: '日焼け止め', store: 'ドラッグストア', aliases: ['protetor solar', 'filtro solar', 'sunscreen', '日焼け止め'] },
      { label: 'Sérum e skincare', kw: '美容液', store: 'コスメ', aliases: ['serum', 'creme facial', 'hidratante', 'tonico', '美容液', '化粧水'] },
    ],
  },
  {
    key: 'perfumes', label: 'Perfumes', store: '香水',
    aliases: ['perfume', 'perfumes', 'fragrancia', 'fragrancias', 'colonia', 'fragrance', '香水', 'フレグランス'],
    subs: [
      { label: 'Dior', kw: 'ディオール 香水', store: 'ディオール', aliases: ['perfume dior', 'sauvage', 'miss dior'] },
      { label: 'Chanel', kw: 'シャネル 香水', store: 'シャネル', aliases: ['perfume chanel', 'chanel n5', 'bleu de chanel'] },
      { label: 'Jo Malone', kw: 'ジョーマローン', store: 'ジョーマローン', aliases: ['jo malone', 'ジョーマローン'] },
      { label: 'Tom Ford', kw: 'トムフォード 香水', store: 'トムフォード', aliases: ['tom ford'] },
      { label: 'Le Labo', kw: 'ルラボ', store: 'ルラボ', aliases: ['le labo'] },
      { label: 'Diptyque', kw: 'ディプティック', store: 'ディプティック', aliases: ['diptyque'] },
      { label: 'Byredo', kw: 'バイレード', store: 'バイレード', aliases: ['byredo'] },
      { label: 'Perfumes árabes', kw: 'アラビアン 香水', store: '香水', aliases: ['perfume arabe', 'perfumes arabes', 'arabe', 'lattafa', 'rasasi', 'oud'] },
      { label: 'Masculinos', kw: '香水 メンズ', store: '香水', aliases: ['perfume masculino', 'perfumes masculinos'] },
      { label: 'Femininos', kw: '香水 レディース', store: '香水', aliases: ['perfume feminino', 'perfumes femininos'] },
    ],
  },
  {
    key: 'eletronicos', label: 'Eletrônicos', store: '家電量販店',
    aliases: ['eletronico', 'eletronicos', 'eletronica', 'gadget', 'gadgets', 'tecnologia', '家電', '電化製品'],
    subs: [
      { label: 'iPhone', kw: 'iPhone 本体', store: 'Apple', aliases: ['iphone', 'celular apple'] },
      { label: 'iPad', kw: 'iPad 本体', store: 'Apple', aliases: ['ipad', 'tablet'] },
      { label: 'AirPods', kw: 'AirPods', store: 'Apple', aliases: ['airpods', 'airpod'] },
      { label: 'Apple Watch', kw: 'Apple Watch', store: 'Apple', aliases: ['apple watch', 'smartwatch'] },
      { label: 'Fones de ouvido', kw: 'ワイヤレスイヤホン', store: 'イヤホン', aliases: ['fone', 'fone de ouvido', 'fones', 'headphone', 'earphone', 'イヤホン', 'ヘッドホン'] },
      { label: 'Câmeras', kw: 'デジタルカメラ', store: 'カメラ', aliases: ['camera', 'camera digital', 'maquina fotografica', 'カメラ'] },
      { label: 'Instax (Cheki)', kw: 'チェキ', store: 'カメラ', aliases: ['instax', 'cheki', 'polaroid', 'チェキ'] },
      { label: 'Secadores e beleza', kw: 'ドライヤー', store: '家電量販店', aliases: ['secador', 'secador de cabelo', 'dyson', 'nanocare', 'ドライヤー'] },
      { label: 'Panela de arroz', kw: '炊飯器', store: '家電量販店', aliases: ['panela de arroz', 'rice cooker', '炊飯器'] },
      { label: 'Notebooks', kw: 'ノートパソコン', store: '家電量販店', aliases: ['notebook', 'laptop', 'computador', 'macbook', 'ノートパソコン'] },
    ],
  },
  {
    key: 'games', label: 'Games', store: 'ゲームショップ',
    aliases: ['game', 'games', 'jogo', 'jogos', 'videogame', 'video game', 'console', 'consoles', 'ゲーム'],
    subs: [
      { label: 'Nintendo Switch 2', kw: 'Nintendo Switch 2 本体', store: 'ゲームショップ', aliases: ['switch 2', 'nintendo switch 2'] },
      { label: 'Nintendo Switch', kw: 'Nintendo Switch 本体', store: 'ゲームショップ', aliases: ['switch', 'nintendo switch', 'nintendo'] },
      { label: 'Jogos de Switch', kw: 'Switch ソフト', store: 'ゲームショップ', aliases: ['jogo switch', 'jogos switch', 'jogos de switch'] },
      { label: 'PlayStation 5', kw: 'PS5 本体', store: 'ゲームショップ', aliases: ['ps5', 'playstation', 'playstation 5'] },
      { label: 'Jogos de PS5', kw: 'PS5 ソフト', store: 'ゲームショップ', aliases: ['jogo ps5', 'jogos ps5', 'jogos de ps5'] },
      { label: 'Controles', kw: 'コントローラー ゲーム', store: 'ゲームショップ', aliases: ['controle', 'controles', 'joystick', 'controle de videogame'] },
      { label: 'Amiibo', kw: 'amiibo', store: 'ゲームショップ', aliases: ['amiibo'] },
      { label: 'Retrô', kw: 'レトロゲーム', store: 'レトロゲーム', aliases: ['retro', 'jogo retro', 'games retro', 'famicom', 'super nintendo', 'レトロゲーム'] },
    ],
  },
  {
    key: 'anime', label: 'Anime e colecionáveis', store: 'ホビーショップ',
    aliases: ['anime', 'animes', 'colecionavel', 'colecionaveis', 'otaku', 'figure', 'figures', 'figura', 'figuras', 'manga', 'アニメ', 'フィギュア', 'グッズ'],
    subs: [
      { label: 'Figures', kw: 'フィギュア', store: 'フィギュア', aliases: ['figure anime', 'scale figure'] },
      { label: 'Ichiban Kuji', kw: '一番くじ', store: '一番くじ', aliases: ['ichiban kuji', 'kuji', '一番くじ'] },
      { label: 'Pokémon (produtos)', kw: 'ポケモン グッズ', store: 'ポケモンセンター', aliases: ['pokemon center', 'produtos pokemon', 'pelucia pokemon'] },
      { label: 'Sanrio', kw: 'サンリオ', store: 'サンリオ', aliases: ['sanrio', 'hello kitty', 'kuromi', 'my melody', 'サンリオ'] },
      { label: 'Chiikawa', kw: 'ちいかわ', store: 'ちいかわ', aliases: ['chiikawa', 'ちいかわ'] },
      { label: 'Studio Ghibli', kw: 'ジブリ グッズ', store: 'どんぐり共和国', aliases: ['ghibli', 'totoro', 'studio ghibli'] },
      { label: 'Dragon Ball', kw: 'ドラゴンボール フィギュア', store: 'フィギュア', aliases: ['dragon ball', 'goku'] },
      { label: 'One Piece', kw: 'ワンピース フィギュア', store: 'フィギュア', aliases: ['one piece', 'luffy'] },
      { label: 'Demon Slayer', kw: '鬼滅の刃 グッズ', store: 'アニメイト', aliases: ['demon slayer', 'kimetsu', 'kimetsu no yaiba'] },
      { label: 'Disney', kw: 'ディズニー グッズ', store: 'ディズニーストア', aliases: ['disney', 'ディズニー'] },
      { label: 'Mangás', kw: '漫画 全巻セット', store: '本屋', aliases: ['manga', 'mangas', 'colecao de manga'] },
    ],
  },
  {
    key: 'bolsas', label: 'Bolsas e acessórios', store: 'ブランドショップ',
    aliases: ['bolsa', 'bolsas', 'acessorio', 'acessorios', 'carteira', 'carteiras', 'grife', 'marca de luxo', 'luxo', 'バッグ', 'ブランド'],
    subs: [
      { label: 'Louis Vuitton', kw: 'ルイヴィトン', store: 'ブランド買取', aliases: ['louis vuitton', 'lv', 'vuitton'] },
      { label: 'Gucci', kw: 'グッチ', store: 'ブランド買取', aliases: ['gucci'] },
      { label: 'Hermès', kw: 'エルメス', store: 'ブランド買取', aliases: ['hermes'] },
      { label: 'Prada', kw: 'プラダ', store: 'ブランド買取', aliases: ['prada'] },
      { label: 'Coach', kw: 'コーチ バッグ', store: 'コーチ', aliases: ['coach'] },
      { label: 'Porter (Yoshida)', kw: 'ポーター バッグ', store: 'ポーター', aliases: ['porter', 'yoshida porter'] },
      { label: 'Anello', kw: 'アネロ', store: 'アネロ', aliases: ['anello'] },
      { label: 'Carteiras', kw: '財布', store: 'ブランドショップ', aliases: ['carteira de couro', 'wallet', '財布'] },
      { label: 'Mochilas', kw: 'リュック', store: 'バッグ', aliases: ['mochila', 'mochilas', 'backpack', 'リュック'] },
      { label: 'Óculos de sol', kw: 'サングラス', store: 'サングラス', aliases: ['oculos', 'oculos de sol', 'sunglasses'] },
    ],
  },
  {
    key: 'relogios', label: 'Relógios', store: '時計店',
    aliases: ['relogio', 'relogios', 'watch', 'watches', '腕時計', '時計'],
    subs: [
      { label: 'Seiko', kw: 'セイコー 腕時計', store: 'セイコー', aliases: ['seiko'] },
      { label: 'Grand Seiko', kw: 'グランドセイコー', store: 'グランドセイコー', aliases: ['grand seiko'] },
      { label: 'G-Shock', kw: 'G-SHOCK', store: 'G-SHOCK', aliases: ['g shock', 'g-shock', 'gshock'] },
      { label: 'Casio', kw: 'カシオ 腕時計', store: '時計店', aliases: ['casio', 'casio vintage'] },
      { label: 'Citizen', kw: 'シチズン 腕時計', store: 'シチズン', aliases: ['citizen'] },
      { label: 'Orient', kw: 'オリエント 腕時計', store: '時計店', aliases: ['orient'] },
      { label: 'Rolex (usados)', kw: 'ロレックス', store: '時計 買取', aliases: ['rolex'] },
    ],
  },
  {
    key: 'casa', label: 'Casa e cozinha', store: '雑貨屋',
    aliases: ['casa', 'cozinha', 'utensilio', 'utensilios', 'decoracao', 'キッチン', '雑貨'],
    subs: [
      { label: 'Facas japonesas', kw: '包丁', store: '刃物', aliases: ['faca', 'facas', 'faca japonesa', 'knife', '包丁'] },
      { label: 'Garrafas térmicas', kw: '水筒 象印', store: '雑貨屋', aliases: ['garrafa termica', 'garrafa', 'thermos', 'zojirushi', '水筒'] },
      { label: 'Louças e cerâmica', kw: '食器 和食器', store: '食器', aliases: ['louca', 'pratos', 'ceramica', 'tigela', '食器'] },
      { label: 'Hashi', kw: '箸', store: '雑貨屋', aliases: ['hashi', 'chopsticks', '箸'] },
      { label: 'Panelas', kw: '鍋', store: '雑貨屋', aliases: ['panela', 'panelas', 'frigideira', '鍋'] },
      { label: 'Daiso / 100 yen', kw: '100均', store: '100円ショップ', aliases: ['daiso', '100 yen', 'cem yen', '100均', 'ダイソー'] },
    ],
  },
  {
    key: 'bebe', label: 'Bebês e crianças', store: 'ベビー用品',
    aliases: ['bebe', 'bebes', 'crianca', 'criancas', 'infantil', 'baby', 'ベビー', 'キッズ'],
    subs: [
      { label: 'Fraldas', kw: 'おむつ', store: 'ドラッグストア', aliases: ['fralda', 'fraldas', 'merries', 'moony', 'おむつ'] },
      { label: 'Mamadeiras', kw: '哺乳瓶', store: 'ベビー用品', aliases: ['mamadeira', 'mamadeiras', 'pigeon', '哺乳瓶'] },
      { label: 'Carrinho de bebê', kw: 'ベビーカー', store: 'ベビー用品', aliases: ['carrinho de bebe', 'carrinho bebe', 'ベビーカー'] },
      { label: 'Brinquedos educativos', kw: '知育玩具', store: 'おもちゃ屋', aliases: ['brinquedo educativo', 'brinquedos educativos', 'montessori', '知育玩具'] },
      { label: 'Roupas infantis', kw: 'ベビー服', store: 'ベビー用品', aliases: ['roupa de bebe', 'roupa infantil', 'roupas infantis', 'ベビー服'] },
    ],
  },
  {
    key: 'comida', label: 'Comidas e bebidas', store: 'スーパー',
    aliases: ['comida', 'comidas', 'doce', 'doces', 'snack', 'snacks', 'salgadinho', 'bebida', 'bebidas', 'お菓子', '食品'],
    subs: [
      { label: 'Kit Kat japonês', kw: 'キットカット', store: 'スーパー', aliases: ['kitkat', 'kit kat', 'キットカット'] },
      { label: 'Doces e salgadinhos', kw: 'お菓子 詰め合わせ', store: 'スーパー', aliases: ['doce japones', 'doces japoneses', 'salgadinhos', 'japanese snacks'] },
      { label: 'Matcha e chás', kw: '抹茶', store: 'お茶屋', aliases: ['matcha', 'cha', 'cha verde', 'green tea', '抹茶'] },
      { label: 'Saquê', kw: '日本酒', store: '酒屋', aliases: ['sake', 'saque', '日本酒'] },
      { label: 'Whisky japonês', kw: 'ジャパニーズウイスキー', store: '酒屋', aliases: ['whisky', 'whiskey', 'uisque', 'yamazaki', 'hibiki', 'ウイスキー'] },
    ],
  },
  {
    key: 'esporte', label: 'Esporte e outdoor', store: 'スポーツ用品店',
    aliases: ['esporte', 'esportes', 'academia', 'outdoor', 'sport', 'sports', 'スポーツ'],
    subs: [
      { label: 'Golfe', kw: 'ゴルフクラブ', store: 'ゴルフショップ', aliases: ['golfe', 'golf', 'taco de golfe', 'ゴルフ'] },
      { label: 'Pesca', kw: '釣り リール', store: '釣具店', aliases: ['pesca', 'molinete', 'carretilha', 'vara de pesca', '釣り'] },
      { label: 'Camping', kw: 'キャンプ用品', store: 'アウトドアショップ', aliases: ['camping', 'acampamento', 'barraca', 'snow peak', 'キャンプ'] },
      { label: 'Basquete', kw: 'バスケットボール', store: 'スポーツ用品店', aliases: ['basquete', 'basketball', 'bola de basquete'] },
      { label: 'Futebol', kw: 'サッカー スパイク', store: 'スポーツ用品店', aliases: ['futebol', 'chuteira', 'chuteiras', 'soccer'] },
      { label: 'Bicicletas', kw: '自転車', store: '自転車屋', aliases: ['bicicleta', 'bike', '自転車'] },
    ],
  },
];

// ---- busca no catálogo ----
const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'para', 'pra', 'o', 'a', 'os', 'as', 'um', 'uma', 'e', 'com']);

// deixa "Carrinhos de Brinquedo" igual a "carrinho brinquedo"
export function normalize(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:()"'´`]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 3 && /[a-z]s$/.test(w) ? w.slice(0, -1) : w))
    .join(' ');
}

let INDEX = null;
function buildIndex() {
  INDEX = new Map();
  for (const cat of CATALOG) {
    for (const a of [cat.label, ...cat.aliases]) INDEX.set(normalize(a), { cat });
    for (const sub of cat.subs) {
      for (const a of [sub.label, ...sub.aliases]) {
        const k = normalize(a);
        if (!INDEX.has(k)) INDEX.set(k, { cat, sub }); // a categoria tem prioridade
      }
    }
  }
}

// "maquiagem" → { cat }; "carro de brinquedo" → { cat, sub }; outra coisa → null
export function matchCatalog(q) {
  if (!INDEX) buildIndex();
  return INDEX.get(normalize(q)) || null;
}

export function findCategory(key) {
  return CATALOG.find((c) => c.key === key) || null;
}

export const hasJapanese = (s) => /[぀-ヿ㐀-鿿]/.test(String(s || ''));
