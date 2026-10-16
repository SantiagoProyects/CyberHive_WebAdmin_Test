#!/bin/bash
echo "================================================="
echo "   Iniciando Servidor IA Local (CyberHive)       "
echo "================================================="
echo "Matando procesos antiguos..."
fuser -k -9 5000/tcp 2>/dev/null
killall -9 ia_server_linux 2>/dev/null
sleep 1

cd /home/santiago/Documentos/TESIS/CyberHive/Backend_AI/dist
echo "Iniciando binario..."
./ia_server_linux

echo "Servidor detenido."
read -p "Presiona Enter para cerrar esta ventana..."
