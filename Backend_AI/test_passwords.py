import json
from zxcvbn import zxcvbn

def eval_pwd(pwd):
    results = zxcvbn(pwd)
    guesses_log10 = results.get("guesses_log10", 0)
    score = 0
    if guesses_log10 <= 2: score = int(guesses_log10 * 10)
    elif guesses_log10 <= 6: score = 20 + int(((guesses_log10 - 2) / 4.0) * 30)
    elif guesses_log10 <= 10: score = 50 + int(((guesses_log10 - 6) / 4.0) * 30)
    elif guesses_log10 <= 14: score = 80 + int(((guesses_log10 - 10) / 4.0) * 20)
    else: score = 100
    score = max(0, min(100, score))
    print(f"Pwd: {pwd:<25} | Score: {score} | Log10: {guesses_log10:.2f}")

eval_pwd("bifrostquantum")
eval_pwd("12345678")
eval_pwd("bifrostquantum123")
eval_pwd("bifrostquantum!")
eval_pwd("BifrostQuantum!")
