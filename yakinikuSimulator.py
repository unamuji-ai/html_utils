import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import random

# --- 日本語フォントの設定 ---
plt.rcParams['font.family'] = ['MS Gothic', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', 'sans-serif']

# --- 新仕様：7タイプ ---
types = ["カルビ","タン","ハラミ","ロース","ミノ","レバー","カルビクッパ"]

# --- 新スコア（JS版と完全一致） ---
scores_data = {}
for q in range(10):
    scores_data[f"{q}-0"] = [3,1,1,1,1,1,0]  # A
    scores_data[f"{q}-1"] = [1,3,3,3,1,1,0]  # B
    scores_data[f"{q}-2"] = [1,1,1,1,1,1,4]  # C（カルビクッパ特化）
    scores_data[f"{q}-3"] = [1,1,1,1,3,3,0]  # D

# --- シミュレーション ---
def run_simulation(n=10000):
    results = []
    for _ in range(n):
        total_score = [0] * 7
        for q_idx in range(10):
            a_idx = random.randint(0, 3)
            current_scores = scores_data[f"{q_idx}-{a_idx}"]
            for i in range(7):
                total_score[i] += current_scores[i]

        scored_types = [{"type": types[i], "score": total_score[i]} for i in range(7)]
        sorted_res = sorted(scored_types, key=lambda x: x["score"], reverse=True)

        results.append({
            "top": sorted_res[0]["type"],
            "diff": sorted_res[0]["score"] - sorted_res[1]["score"]
        })

    return pd.DataFrame(results)

# --- 実行 ---
df = run_simulation(10000)

# --- 可視化 ---
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# 左：1位の分布
sns.countplot(data=df, x='top', order=types, ax=ax1, palette='YlOrRd')
ax1.set_title("新仕様：第1位に選ばれるタイプの分布")
ax1.set_xticklabels(ax1.get_xticklabels(), rotation=45)

# 右：1位と2位の点数差
sns.histplot(df['diff'], bins=range(15), kde=True, ax=ax2, color='skyblue')
ax2.axvline(3, color='blue', linestyle='--', label="MIX判定（差が3以内）")
ax2.set_title("新仕様：1位と2位の点数差（MIX発生率）")
ax2.legend()

plt.tight_layout()
plt.show()

# --- 出現率 ---
print("--- タイプ別出現率（新仕様） ---")
print(df['top'].value_counts(normalize=True).apply(lambda x: f"{x:.2%}"))