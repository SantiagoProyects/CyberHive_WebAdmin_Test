import pandas as pd
import numpy as np
import pickle
import math
import string
import re
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

def extract_features(password):
    if not isinstance(password, str):
        password = str(password)
        
    length = len(password)
    num_upper = sum(1 for c in password if c.isupper())
    num_lower = sum(1 for c in password if c.islower())
    num_digits = sum(1 for c in password if c.isdigit())
    num_symbols = sum(1 for c in password if c in string.punctuation)
    
    # Entropy calculation
    entropy = 0
    if length > 0:
        for x in set(password):
            p_x = float(password.count(x)) / length
            entropy += - p_x * math.log2(p_x)
            
    # Sequential characters penalty (e.g. 1234, abcd)
    has_seq = 0
    if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', password.lower()):
        has_seq = 1
    if re.search(r'(012|123|234|345|456|567|678|789|890)', password):
        has_seq = 1
        
    return [length, num_upper, num_lower, num_digits, num_symbols, entropy, has_seq]

if __name__ == "__main__":
    print("Cargando dataset...")
    df = pd.read_csv("password_dataset.csv")
    
    print("Extrayendo características...")
    X = np.array([extract_features(p) for p in df['password']])
    y = df['score'].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Entrenando modelo Random Forest...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    print("Evaluando modelo...")
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Error Cuadrático Medio (MSE): {mse:.2f}")
    print(f"Precisión R2: {r2:.2f}")
    
    print("Guardando modelo en 'password_model.pkl'...")
    with open("password_model.pkl", "wb") as f:
        pickle.dump(model, f)
        
    print("¡Entrenamiento finalizado exitosamente!")
