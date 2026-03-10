import random
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# --- 1. 定数・相性マトリックスの設定 ---
NUM_TRIALS = 10000
NUM_PLAYERS = 5
ELEMENTS = ["Fire", "Water", "Wood", "Earth"]

# 非対称属性マトリックス (行:攻撃側, 列:防御側)
# 木が水・土に強く、火が木に超特効（2.0倍）
MATRIX = [
    #Fire, Water, Wood, Earth (防御側)
    [1.0,  0.7,   2.0,  1.2], # Fire (攻撃側)
    [1.5,  1.0,   0.7,  1.0], # Water
    [0.7,  1.5,   1.0,  1.5], # Wood
    [1.0,  1.0,   0.7,  1.0]  # Earth
]

# --- 2. カードクラスの定義 ---
class Card:
    def __init__(self, p_id):
        # 表示上のパラメータ (0-100)
        self.raw_atk = random.randint(10, 100)
        self.raw_hp = random.randint(10, 100)
        self.raw_spd = random.randint(10, 100)
        self.raw_def = random.randint(0, 100)
        self.elm = random.randint(0, 3)
        
        # 内部計算用の補正値 (実数値への変換)
        # HP: 2.5倍(最大250), ATK: 0.6倍(最大60), DEF: 0.3倍(最大30)
        self.atk_val = self.raw_atk * 0.6
        self.hp_val = self.raw_hp * 2.5
        self.spd_val = self.raw_spd * 1.0
        self.def_val = self.raw_def * 0.3
        
        self.current_hp = self.hp_val
        
        # ランク判定用の合計値 (400点満点)
        self.total = self.raw_atk + self.raw_hp + self.raw_spd + self.raw_def

    def get_rank(self):
        if self.total >= 320: return "SSR"
        if self.total >= 240: return "SR"
        if self.total >= 160: return "R"
        return "N"

# --- 3. バトルロジック ---
def duel(p1_cards, p2_cards):
    while p1_cards and p2_cards:
        c1, c2 = p1_cards[0], p2_cards[0]
        while c1.current_hp > 0 and c2.current_hp > 0:
            # SPD比率先制判定
            first, second = (c1, c2) if random.random() * (c1.spd_val + c2.spd_val) < c1.spd_val else (c2, c1)
            
            # ダメージ = (ATK * 相性) - DEF (最低1)
            mod = MATRIX[first.elm][second.elm]
            dmg = max(1, int(first.atk_val * mod - second.def_val))
            second.current_hp -= dmg
            
            if second.current_hp > 0:
                mod_rev = MATRIX[second.elm][first.elm]
                dmg_rev = max(1, int(second.atk_val * mod_rev - first.def_val))
                first.current_hp -= dmg_rev
        
        if c1.current_hp <= 0: p1_cards.pop(0)
        if c2.current_hp <= 0: p2_cards.pop(0)

# --- 4. シミュレーション実行 ---
def run_simulation():
    results = []
    for _ in range(NUM_TRIALS):
        players = []
        for i in range(NUM_PLAYERS):
            # 各プレイヤーにカードを2枚配布
            cards = [Card(i), Card(i)]
            # 統計用に「先鋒」のデータを代表値として保存
            players.append({"id": i, "cards": cards, "stats": cards[0]})
        
        alive = players[:]
        while len(alive) > 1:
            p1, p2 = random.sample(alive, 2)
            duel(p1["cards"], p2["cards"])
            alive = [p for p in alive if p["cards"]]
            
        winner = alive[0]
        ws = winner["stats"]
        results.append({
            "atk": ws.raw_atk, "hp": ws.raw_hp, "spd": ws.raw_spd, "def": ws.raw_def,
            "elm": ELEMENTS[ws.elm], "total": ws.total, "rank": ws.get_rank()
        })
    return pd.DataFrame(results)

# --- 5. 可視化 ---
print("シミュレーション実行中...")
df = run_simulation()

plt.figure(figsize=(15, 12))

# 属性分布
plt.subplot(2, 2, 1)
sns.countplot(data=df, x='elm', order=ELEMENTS, palette='viridis')
plt.title("Winner's Element (All 100 Scale)")

# ランク分布
plt.subplot(2, 2, 2)
sns.countplot(data=df, x='rank', order=["N", "R", "SR", "SSR"], palette='magma')
plt.title("Winner's Rank (320+ = SSR)")

# パラメータ傾向
plt.subplot(2, 2, 3)
melted_df = df.melt(value_vars=['atk', 'hp', 'spd', 'def'], var_name='stat', value_name='value')
sns.boxplot(data=melted_df, x='stat', y='value')
plt.title("Winner's Stat Distribution (Raw 100 Scale)")

# 合計値分布
plt.subplot(2, 2, 4)
sns.histplot(df['total'], kde=True, color='blue')
plt.title("Winner's Total Score (Max 400)")

plt.tight_layout()
plt.show()

print("\n--- 統計データ ---")
print(df['elm'].value_counts())
print("\n--- ランク別勝利数 ---")
print(df['rank'].value_counts())


# --- 勝利数ではなく勝利率 (Win Rate) を計算 ---

# 1. 全生成カードのランク分布を把握する（分母）
# シミュレーション内で生成された全カードのランクを数える必要があります
all_generated_ranks = []
for _ in range(NUM_TRIALS):
    for i in range(NUM_PLAYERS):
        for card_idx in range(2): # 1人2枚
            c = Card(i)
            all_generated_ranks.append(c.get_rank())

total_rank_counts = pd.Series(all_generated_ranks).value_counts()

# 2. 優勝者のランク数を取得（分子）
winner_rank_counts = df['rank'].value_counts()

# 3. 勝利率を計算
win_rate = (winner_rank_counts / total_rank_counts).fillna(0)
win_rate = win_rate.reindex(["N", "R", "SR", "SSR"])

# --- 勝利率の可視化 ---
plt.figure(figsize=(8, 5))
sns.barplot(x=win_rate.index, y=win_rate.values, palette='magma')
plt.title("Win Rate by Rank (Winner Counts / Total Generated)")
plt.ylabel("Win Rate (%)")
plt.show()

print("\n--- ランク別勝利率 ---")
print(win_rate)

