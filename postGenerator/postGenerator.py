import streamlit as st
import pandas as pd
import plotly.express as px
import random

# ページ設定
st.set_page_config(page_title="あなたに対するネット上の評価", layout="centered")

# --- セッション状態の初期化 ---
if 'step' not in st.session_state:
    st.session_state.step = 0
if 'answers' not in st.session_state:
    st.session_state.answers = []
# sales: 沼らせ, mental: 耐性, risk: 炎上, compliance: 規約遵守
if 'points' not in st.session_state:
    st.session_state.points = {"sales": 0, "mental": 0, "risk": 0, "compliance": 0}

# --- 設問データ (配点は変更なし) ---
questions = [
    # SNS・自撮り編
    {"q": "自撮りの投稿傾向は？", "options": [
        ("清楚・美少女系", (10, 5, 0, 30)), ("グラビア系", (20, 10, 10, 5)), 
        ("露出・エロ寄り", (30, 20, 40, 0)), ("病み・地雷系", (15, -10, 20, 20))]},
    {"q": "客へのSNS営業のメイン手法は？", "options": [
        ("ポストのみ", (0, -10, 0, 20)), ("DMで「今日いるよ！」", (20, -5, 10, 10)), 
        ("DMで「寂しい」", (40, 15, 20, 0)), ("DMで「今日来て！何時くる？」", (30, 5, 10, 0))]},
    {"q": "SNSでの返信・いいね運用は？", "options": [
        ("ほとんどしない", (0, -5, 5, 20)), ("出勤日にいいねだけ", (-10, 0, 10, 20)), 
        ("太客・オキニには厚めに", (20, 5, 30, 5)), ("気まぐれに適当", (10, 10, 10, 10))]},

    # 接客・ドリンク編
    {"q": "ドリンクのねだり方は？", "options": [
        ("いただけてもよろしいですか？", (5, 0, 5, 25)), ("ねー、なんか飲んでいい？", (20, 10, 20, -5)), 
        ("無言で見つめる", (20, 15, 25, 20)), ("喉乾いちゃった🥺", (10, 10, 10, 5))]},
    {"q": "チェキ撮影時の物理的距離は？", "options": [
        ("ソーシャルディスタンス", (0, 0, 0, 30)), ("こぶし一つ分", (10, 5, 5, 20)), 
        ("多少の接触まで", (30, 5, 20, 5)), ("完全な接触・密着", (50, 10, 40, 0))]},
    
    # ガチ恋対応編
    {"q": "【リアル】「付き合ってるよね？」と手を重ねてこられたら？", "options": [
        ("「秘密だよ」と指を絡める", (50, 40, 30, -30)), ("えー何飲んでいい？と高額ボトル要求", (5, 10, 40, 5)), 
        ("笑いながら僅かだけ許容", (40, 5, 10, 10)), ("「接触はNGです」と制する", (-10, 0, -10, 30))]},
    {"q": "【DM】深夜3時の「誰かと一緒？不安」という粘着DMには？", "options": [
        ("朝方に「夢で会えたね」", (20, 10, 10, 10)), ("「お店で待ってる！」", (0, 5, 15, 15)), 
        ("「ごめん、寝てた」の一言", (0, -5, 0, 20)), ("出勤前まで既読放置", (0, -10, -5, 30))]},
    
    # 説教対応編
    {"q": "【リアル】「君の自撮りは良くない」と1時間説教されたら？", "options": [
        ("「私をの事よく見てくれてるね」", (30, 30, -10, 20)), ("「さすが！」と持ち上げて流す", (0, 15, 0, 15)), 
        ("「喉乾いた！お茶飲んでいい？」と遮る", (-15, 0, 10, 10)), ("「自分がかわいいと思えばいいの！」", (-5, 15, 25, 5))]},
    {"q": "【DM】1,000文字超の反省促すDMが届いたら？", "options": [
        ("「寂しくさせてごめんね」", (40, 25, -10, 0)), ("「運営に共有します！」", (-20, -20, -10, 10)), 
        ("スタンプ1個で終了", (-5, 20, 10, 0)), ("読まずに非表示・ミュート", (-5, -20, 0, 0))]},
    
    # 下ネタ・セクハラ編
    {"q": "【リアル】「経験人数何人？」と聞かれたら？", "options": [
        ("「100人目にする？」", (30, 25, 30, -5)), ("何の経験？ととぼける", (0, 5, 5, 15)), 
        ("「シャンパン入れてくれたら考える」", (10, 10, 15, 5)), ("「普通に引きます」と断絶", (-10, -10, -5, 30))]},
    {"q": "【DM】卑猥な画像と共に「送って」と来たら？", "options": [
        ("「お店で見て」", (20, 30, 10, 10)), ("「わー！びっくりｗちっさ」と煽る", (-40, 40, 5, -5)), 
        ("無言で既読スルー", (0, 5, 0, 10)), ("運営に報告・ブロック相談", (-5, -10, -20, 30))]},

    # 特殊客編
    {"q": "【素伝】ドリンク出さない客への対応は？", "options": [
        ("「来てくれるだけいいよ」と聖母対応", (30, 10, -10, 0)), ("「話すると喉渇くんだよね〜」と圧", (0, 10, 10, 5)), 
        ("挨拶だけで放置", (-15, -5, 10, 10)), ("ダメもとでドリンクおねだり", (-20, 5, 0, 10))]},
    {"q": "【推し変】目の前で他の子を褒め始めたら？", "options": [
        ("「他の子がいいんだ」と拗ねる", (30, 10, 0, -10)), ("「あの子可愛いよね！」と割り切る", (10, 10, 0, 5)), 
        ("温度を0にして放置", (5, 0, 5, 0)), ("「戻ってこないでねｗ」と釘", (5, 20, 0, 20))]},
    {"q": "【臭い客】至近距離で臭いがきつい時は？", "options": [
        ("笑顔で耐えて香水を撒く", (20, 30, 0, 10)), ("常に距離をキープ", (5, 0, 0, 10)), 
        ("ファブリーズを撒く", (5, 20, 25, -10)), ("「お風呂入ってきた？ｗ」と指摘", (-10, 30, 5, -10))]},
    {"q": "【繋がり要求】「本名とLINE教えて。倍払う」と言われたら？", "options": [
        ("「もっと仲良くなったらね」", (20, 15, 0, 10)), ("「店辞めたら教える！」", (30, 10, 40, -10)), 
        ("「GPS管理されてるから無理ｗ」", (0, 5, 10, 10)), ("「次言ったら出禁です」", (-10, -10, -10, 40))]},
    {"q": "【店外要求】「店通さずご飯行こう」としつこい場合は？", "options": [
        ("「夢の中でなら！」", (5, 10, 0, 10)), ("「アフター代100万です」", (25, 30, 30, 0)), 
        ("「同伴ならいいよ！」と誘導", (40, 20, 25, -30)), ("「規約違反です」と冷徹に拒否", (-10, -10, -10, 40))]},
    
    # 詰め編
    {"q": "シャンパンが入った時のリアクションは？", "options": [
        ("飛び跳ねて抱きつかんばかりに喜ぶ", (40, 15, 30, 0)), ("「さすが〇〇さん、信じてた」", (10, 10, 0, 10)), 
        ("淡々と、でも丁寧に御礼", (5, -5, 5, 30)), ("「次は別のもほしいな」", (10, 25, 15, 5))]},
    {"q": "客が他の客と喧嘩し始めたら？", "options": [
        ("怖がってるフリで噓泣きする", (20, 30, -10, 0)), ("「他のお客様の迷惑です」と注意", (-5, 20, -5, 30)), 
        ("速やかに黒服（運営）を呼ぶ", (-10, -10, 0, 20)), ("面白いので煽る", (-5, 20, 20, -30))]},
    {"q": "引退（辞める）時の匂わせ方は？", "options": [
        ("「ずっと一緒だよ」と嘘をつき通す", (40, 30, 20, 0)), ("数ヶ月前から「家庭の事情」を小出し", (-10, -10, -10, 20)), 
        ("公式発表まで一切口外しない", (-15, -20, -10, 10)), ("裏垢で呟く", (-5, -10, 20, -10))]},
    {"q": "最後に。あなたにとって「客」とは？", "options": [
        ("人生を豊かにしてくれる存在", (20, 20, 20, 20)), ("ただの「ATM（金）」", (-25, 20, 30, 5)), 
        ("適度な距離で楽しむ遊び相手", (10, 5, 0, 25)), ("接客という仕事の攻略対象", (0, 10, 0, 10))]}
]

TOTAL_STEPS = len(questions)

# --- メインロジック ---
if st.session_state.step == 0:
    st.title("🌐コンカフェ嬢としてのあなたに対するネット上の評価")
    name = st.text_input("源氏名を入力してください", key="name_input")
    if st.button("診断を開始"):
        if name:
            st.session_state.name = name
            st.session_state.step = 1
            st.rerun()

elif 1 <= st.session_state.step <= TOTAL_STEPS:
    idx = st.session_state.step - 1
    q_data = questions[idx]
    st.write(f"第 {st.session_state.step} 問 / {TOTAL_STEPS}")
    st.progress(st.session_state.step / TOTAL_STEPS)
    st.subheader(q_data["q"])
    
    choice_text = st.radio("選択肢：", [opt[0] for opt in q_data["options"]], index=None, key=f"q_{st.session_state.step}")

    if st.button("次へ →"):
        if choice_text:
            selected_opt = next(opt for opt in q_data["options"] if opt[0] == choice_text)
            st.session_state.points["sales"] += selected_opt[1][0]
            st.session_state.points["mental"] += selected_opt[1][1]
            st.session_state.points["risk"] += selected_opt[1][2]
            st.session_state.points["compliance"] += selected_opt[1][3]
            st.session_state.step += 1
            st.rerun()

else:
    st.balloons()
    st.title(f"📊 {st.session_state.name} さんの分析結果")
    
    # --- スコア計算（あなたの配点を維持） ---
    s = min(st.session_state.points["sales"] // 6, 100)
    m = max(min(st.session_state.points["mental"] // 4, 100), 0)
    r = max(min(st.session_state.points["risk"] // 5, 100), 0)
    c = min(st.session_state.points["compliance"] // 5, 100)

    # --- レーダーチャートの表示 ---
    df = pd.DataFrame(dict(
        r=[s, m, r, c],
        theta=['沼らせ', '痛客耐性', '炎上リスク', 'プロ意識']
    ))
    fig = px.line_polar(df, r='r', theta='theta', line_close=True, range_r=[0,100])
    fig.update_traces(fill='toself', line_color='#FF4B4B')
    st.plotly_chart(fig)

    col1, col2 = st.columns(2)
    col1.metric("沼らせスキル", f"{s}%")
    col1.metric("痛客耐性", f"{m}%")
    col2.metric("炎上リスク", f"{r}%")
    col2.metric("プロ意識", f"{c}%")

    st.divider()

    # --- 1. タイプ判定ロジック ---
    if c > 80 and s > 80:
        style = "伝説の1000万プレイヤー"
        desc = "プロ意識と営業力を兼ね備えた、非の打ち所がない夜の女王です。"
    elif r > 70 and s > 70:
        style = "界隈の劇薬・爆弾娘"
        desc = "客を沼らせる力は天才的ですが、常に炎上の火種を抱えているスリル満点タイプ。"
    elif c > 80 and r < 30:
        style = "鉄壁のプロ・公務員系キャスト"
        desc = "店からの信頼度No.1。絶対に繋がりを許さないクリーンな営業が魅力です。"
    elif m > 80 and s < 40:
        style = "鋼のメンタル・守銭奴マスター"
        desc = "何を言われても動じない。淡々とドリンクとボトルを回収する職人肌。"
    elif s < 30 and c < 40:
        style = "迷い込んだ一般人（研修中）"
        desc = "まだ夜の毒に染まっていない純粋さが、逆にコアなファンに刺さります。"
    else:
        style = "バランス型アイドル嬢"
        desc = "全てのステータスが平均以上。これからの立ち回り次第でトップも狙えます。"

    st.success(f"あなたの営業スタイル： **【{style}】**")
    st.write(desc)
    
    # --- 2. タイプ別：SNSスレ反応 ---
    if style == "伝説の1000万プレイヤー":
        type_specific_replies = [
            f"「{st.session_state.name}様、昨日もタワー立ててて震えたわ。格が違いすぎる」",
            f"「このレベルになると、もはや宗教。俺たちの給料じゃ{st.session_state.name}の視界にすら入れない」",
            f"「{st.session_state.name}のプロ意識、全キャストが見習うべきだろこれ」"
        ]
    elif style == "界隈の劇薬・爆弾娘":
        type_specific_replies = [
            f"「【悲報】{st.session_state.name}、また裏垢で爆弾投下。これ半分テロだろｗ」",
            f"「{st.session_state.name}に沼ってる奴、生きて帰ってこれないぞ。通帳の中身空にされる」",
            f"「リスク{r}%ってマジか。運営もよくこれ放置してるな。ハラハラするわｗ」"
        ]
    elif style == "鉄壁のプロ・公務員系キャスト":
        type_specific_replies = [
            f"「{st.session_state.name}のガードの固さは異常。DM送っても全部定型文で返ってくるぞ」",
            f"「繋がり報告が一切ないのが{st.session_state.name}。安心感だけはあるんだよな」",
            f"「↑でももう少し隙を見せてほしいわ。ロボットと喋ってる気分になる時あるｗ」"
        ]
    elif style == "鋼のメンタル・守銭奴マスター":
        type_specific_replies = [
            f"「{st.session_state.name}、1時間説教されても真顔で『で、ドリンクは？』って言ったの伝説すぎる」",
            f"「病みツイート一つもしない{st.session_state.name}のメンタルどうなってんの？サイボーグか？」",
            f"「{st.session_state.name}の目的は金、ただそれだけ。清々しくて逆に好きだわ」"
        ]
    elif style == "迷い込んだ一般人（研修中）":
        type_specific_replies = [
            f"「{st.session_state.name}の素人感がたまらん。まだ世の中に汚されてない感じがする」",
            f"「お願いだから、{st.session_state.name}を悪い太客から守ってくれ。スレ民の総意」",
            f"「今のうちに{st.session_state.name}とチェキ撮っとけ。すぐ辞めるか化けるかのどっちかだぞ」"
        ]
    else:
        type_specific_replies = [
            f"「{st.session_state.name}は安定感あるよな。迷ったらとりあえず会いに行けば間違いない」",
            f"「いい意味で王道。{st.session_state.name}こそがコンカフェ嬢の模範解答だわ」",
            f"「最近あそこの店、{st.session_state.name}が目立ってるな。次期エース候補だろ」"
        ]

    general_replies = [
        f"「お前ら{st.session_state.name}の話しすぎ。本人見てたらどうすんだよｗ」",
        f"「↑どうせ本人はパトロンとご飯行ってるよ。夢見すぎ」",
        f"「診断結果、完全に{st.session_state.name}の今の立ち回りと同じで笑った」"
    ]

    display_replies = random.sample(type_specific_replies, 2) + random.sample(general_replies, 1)

    st.subheader("💬 SNSまとめスレの反応")
    for rep in display_replies:
        st.chat_message("user").write(rep)

    # --- やり直すボタン ---
    if st.button("やり直す"):
        for key in list(st.session_state.keys()): del st.session_state[key]
        st.rerun()
