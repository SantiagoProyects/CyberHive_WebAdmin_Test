import pandas as pd
import secrets
import string
import math

secure_random = secrets.SystemRandom()

# Common dictionary words
rockyou = ["password", "123456", "qwerty", "admin", "dragon", "futbol", 
           "princesa", "bateria", "caballo", "grapa", "correcto", "teclado", "hola", "amor"]

words = ["gato", "perro", "casa", "coche", "vuelo", "verde", "azul", "rojo", "feliz", "triste", "sol", "luna"]

def calculate_shannon_entropy(password):
    if not password: return 0
    entropy = 0
    for x in set(password):
        p_x = float(password.count(x)) / len(password)
        entropy += - p_x * math.log2(p_x)
    return entropy

def synthetic_score(pwd):
    length = len(pwd)
    has_upper = any(c.isupper() for c in pwd)
    has_lower = any(c.islower() for c in pwd)
    has_digit = any(c.isdigit() for c in pwd)
    has_symbol = any(c in string.punctuation for c in pwd)
    
    score = length * 5
    if has_upper: score += 10
    if has_lower: score += 5
    if has_digit: score += 10
    if has_symbol: score += 20
    
    # Penalize dictionary words
    lower_pwd = pwd.lower()
    is_dict = False
    for w in rockyou:
        if w in lower_pwd and len(w) > 4:
            is_dict = True
            break
            
    if is_dict:
        score -= 40
        
    # Passphrases (long strings) get huge boost
    if length >= 16 and not is_dict:
        score += 30
        
    return max(0, min(100, score))

def generate_data(num_samples=2000):
    passwords = []
    scores = []
    
    # 1. Weak passwords (dictionary)
    for _ in range(num_samples // 4):
        pwd = secure_random.choice(rockyou)
        if secure_random.random() > 0.5:
            pwd += str(secure_random.randint(0, 999))
        passwords.append(pwd)
        scores.append(synthetic_score(pwd))
        
    # 2. Medium passwords (mixed)
    for _ in range(num_samples // 4):
        pwd = secure_random.choice(words).capitalize() + str(secure_random.randint(10, 99)) + secure_random.choice("!@#$%")
        passwords.append(pwd)
        scores.append(synthetic_score(pwd))
        
    # 3. Random generated (high entropy)
    for _ in range(num_samples // 4):
        length = secure_random.randint(8, 16)
        chars = string.ascii_letters + string.digits + string.punctuation
        pwd = "".join(secure_random.choice(chars) for _ in range(length))
        passwords.append(pwd)
        scores.append(synthetic_score(pwd))
        
    # 4. Passphrases
    for _ in range(num_samples // 4):
        pwd = "".join(secure_random.choice(words) for _ in range(secure_random.randint(3, 5)))
        if secure_random.random() > 0.5:
            pwd = pwd.capitalize()
        passwords.append(pwd)
        scores.append(synthetic_score(pwd))
        
    return pd.DataFrame({"password": passwords, "score": scores})

if __name__ == "__main__":
    print("Generando dataset sintético...")
    df = generate_data(4000)
    df.to_csv("password_dataset.csv", index=False)
    print(f"Dataset generado con éxito: {len(df)} contraseñas.")
    print(df.sample(5))
