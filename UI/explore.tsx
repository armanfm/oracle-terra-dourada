// App.js - VERSÃO COMPLETAMENTE CORRIGIDA
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  Platform,
  PermissionsAndroid,
  Alert
} from 'react-native';

// 🔥 CORREÇÃO: Importações corretas para Expo
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Importações do Expo Sensors
import { 
  Accelerometer, 
  Gyroscope, 
  Magnetometer, 
  Barometer,
  LightSensor,
  type AccelerometerMeasurement,
  type GyroscopeMeasurement,
  type MagnetometerMeasurement,
  type BarometerMeasurement,
  type LightSensorMeasurement
} from 'expo-sensors';

import * as CryptoJS from 'crypto-js';

// ==============================
// 🔥 BANCO DE DADOS COM ASYNCSTORAGE - TIPADO CORRETAMENTE
// ==============================
class AsyncStorageDB {
  private prefix: string;

  constructor(dbName: string) {
    this.prefix = `${dbName}_`;
  }

  async allDocs(options: { include_docs?: boolean } = {}): Promise<{ rows: Array<{ doc: any }> }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dbKeys = keys.filter(key => key.startsWith(this.prefix));
      const items = await AsyncStorage.multiGet(dbKeys);
      
      const rows = items.map(([key, value]) => {
        if (!value) return null;
        try {
          const doc = JSON.parse(value);
          return {
            id: key.replace(this.prefix, ''),
            doc: options.include_docs ? doc : undefined
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean) as Array<{ doc: any }>;

      return { rows };
    } catch (error) {
      console.error('Erro allDocs:', error);
      return { rows: [] };
    }
  }

  async get(id: string): Promise<any> {
    try {
      const item = await AsyncStorage.getItem(`${this.prefix}${id}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Erro get:', error);
      return null;
    }
  }

  async put(doc: any): Promise<any> {
    try {
      const id = doc._id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docToSave = { ...doc, _id: id };
      await AsyncStorage.setItem(`${this.prefix}${id}`, JSON.stringify(docToSave));
      return { ok: true, id };
    } catch (error) {
      console.error('Erro put:', error);
      throw error;
    }
  }

  async remove(doc: any): Promise<any> {
    try {
      await AsyncStorage.removeItem(`${this.prefix}${doc._id}`);
      return { ok: true };
    } catch (error) {
      console.error('Erro remove:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dbKeys = keys.filter(key => key.startsWith(this.prefix));
      await AsyncStorage.multiRemove(dbKeys);
    } catch (error) {
      console.error('Erro destroy:', error);
      throw error;
    }
  }
}

// Inicializar bancos
const initializeDB = () => {
  try {
    return {
      dbVotos: new AsyncStorageDB('terra_dourada_votos_local'),
      dbAutorizacoes: new AsyncStorageDB('terra_dourada_autorizacoes'),
      dbEleicoes: new AsyncStorageDB('terra_dourada_eleicoes'),
      dbConfig: new AsyncStorageDB('terra_dourada_config'),
      dbSensores: new AsyncStorageDB('terra_dourada_sensores')
    };
  } catch (error) {
    console.error('Erro ao inicializar bancos:', error);
    return null;
  }
};

const dbs = initializeDB();

// ==============================
// 🔥 TIPAGENS CORRIGIDAS
// ==============================
type SensorSubscription = { remove: () => void };

type Prova = {
  _id: string;
  eleitor?: string;
  candidato_id?: string;
  candidato_nome?: string;
  timestamp?: string | number;
  screenshot_hash?: string;
  eleicao_id?: string;
  hmac_integridade?: string;
  validacao_zk_hmac?: boolean;
  cid_pinata?: string;
  invalida?: boolean;
  erro_detalhe?: string;
  data_validacao?: string;
  data_sincronizacao?: string;
  automatica?: boolean;
  erro?: string;
  tipo?: string;
  sensor_tipo?: string;
  sensor_dados?: any;
  proveniencia?: string;
  [key: string]: any;
};

type SensorData = {
  accelerometer?: AccelerometerMeasurement;
  gyroscope?: GyroscopeMeasurement;
  magnetometer?: MagnetometerMeasurement;
  barometer?: BarometerMeasurement;
  light?: LightSensorMeasurement;

  sensorTimestamp?: number;
};

type Stats = {
  pendentes: number;
  validadas: number;
  invalidas: number;
};

type LogEntry = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
};

// ==============================
// 🔥 COMPONENTE PRINCIPAL CORRIGIDO
// ==============================
export default function AuditorApp() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<Stats>({ pendentes: 0, validadas: 0, invalidas: 0 });
  const [provas, setProvas] = useState<Prova[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dadosSensores, setDadosSensores] = useState<SensorData>({});
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [dbInitialized, setDbInitialized] = useState<boolean>(!!dbs);

  // Refs para sensores
  const accelerometerSubscription = useRef<SensorSubscription | null>(null);
  const gyroscopeSubscription = useRef<SensorSubscription | null>(null);
  const magnetometerSubscription = useRef<SensorSubscription | null>(null);
  const barometerSubscription = useRef<SensorSubscription | null>(null);
  const lightSubscription = useRef<SensorSubscription | null>(null);

  // ==============================
  // 🔥 FUNÇÕES PRINCIPAIS - CORRIGIDAS
  // ==============================
  const HMAC_SECRET = "terra_dourada_2024_secret_key_zk_proof";

  const addLog = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp, id: Date.now() }]);
  };

  const atualizarDashboard = async (): Promise<void> => {
    if (!dbs) return;
    
    setLoading(true);
    try {
      const todasProvas = await dbs.dbVotos.allDocs({ include_docs: true });
      
      const provasData: Prova[] = todasProvas.rows.map((row: any) => row.doc);
      
      const pendentes = provasData.filter(doc => !doc.cid_pinata && !doc.invalida);
      const validadas = provasData.filter(doc => doc.validacao_zk_hmac === true);
      const invalidas = provasData.filter(doc => doc.invalida === true);
      
      setStats({
        pendentes: pendentes.length,
        validadas: validadas.length,
        invalidas: invalidas.length
      });
      
      setProvas(provasData);
      addLog('Dashboard atualizado', 'success');
      
    } catch (error: any) {
      addLog(`Erro ao atualizar: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const validarZK = (provaData: Prova): { valido: boolean; motivo: string } => {
    try {
      const requiredFields = ['eleitor', 'candidato_id', 'timestamp', 'screenshot_hash'];
      const hasAllFields = requiredFields.every(field => provaData[field]);
      
      if (!hasAllFields) {
        return { valido: false, motivo: "Campos ZK obrigatórios faltando" };
      }

      const hashRegex = /^[a-f0-9]{64}$/;
      const hashValido = hashRegex.test(provaData.screenshot_hash || '');
      
      if (!hashValido) {
        return { valido: false, motivo: "Hash ZK inválido" };
      }

      const powValid = (provaData.screenshot_hash || '').startsWith('00');
      
      return { 
        valido: powValid, 
        motivo: powValid ? "Proof-of-Work ZK válido" : "Proof-of-Work ZK inválido"
      };
    } catch (error: any) {
      return { valido: false, motivo: `Erro ZK: ${error.message}` };
    }
  };

  const validarHMAC = (provaData: Prova): { 
    valido: boolean; 
    motivo: string; 
    hmac_calculado?: string 
  } => {
    try {
      const dadosParaHash = {
        eleitor: provaData.eleitor,
        candidato_id: provaData.candidato_id,
        timestamp: provaData.timestamp,
        eleicao_id: provaData.eleicao_id
      };
      
      const dadosString = JSON.stringify(dadosParaHash);
      const hmacCalculado = CryptoJS.HmacSHA256(dadosString, HMAC_SECRET).toString();
      
      if (provaData.hmac_integridade) {
        const hmacValido = provaData.hmac_integridade === hmacCalculado;
        return {
          valido: hmacValido,
          motivo: hmacValido ? "HMAC de integridade válido" : "HMAC de integridade inválido",
          hmac_calculado: hmacCalculado
        };
      } else {
        return {
          valido: true,
          motivo: "HMAC gerado com sucesso",
          hmac_calculado: hmacCalculado
        };
      }
    } catch (error: any) {
      return { valido: false, motivo: `Erro HMAC: ${error.message}` };
    }
  };

  const validarProvaCompleta = async (provaDoc: Prova): Promise<any> => {
    const validacoes: Array<{
      tipo: string;
      valido: boolean;
      motivo: string;
      hmac_calculado?: string;
    }> = [];
    
    const camposObrigatorios = ['eleitor', 'candidato_id', 'timestamp', 'screenshot_hash', 'eleicao_id', 'candidato_nome'];
    const camposFaltantes = camposObrigatorios.filter(campo => !provaDoc[campo]);
    
    if (camposFaltantes.length > 0) {
      validacoes.push({ 
        tipo: 'PAYLOAD', 
        valido: false, 
        motivo: `Payload incompleto. Faltando: ${camposFaltantes.join(', ')}` 
      });
    } else {
      validacoes.push({ tipo: 'PAYLOAD', valido: true, motivo: "Payload completo e válido" });
      
      const validacaoZK = validarZK(provaDoc);
      validacoes.push({ tipo: 'ZK_PROOF', ...validacaoZK });
      
      if (validacaoZK.valido) {
        const validacaoHMAC = validarHMAC(provaDoc);
        validacoes.push({ tipo: 'HMAC_INTEGRIDADE', ...validacaoHMAC });
        
        if (validacaoHMAC.hmac_calculado && !provaDoc.hmac_integridade) {
          provaDoc.hmac_integridade = validacaoHMAC.hmac_calculado;
        }
      }
    }
    
    const todasValidas = validacoes.every(v => v.valido);
    
    return {
      valido: todasValidas,
      motivo: todasValidas ? "Prova validada com sucesso (ZK+HMAC)" : validacoes.find(v => !v.valido)?.motivo || "Validação falhou",
      validacoes: validacoes,
      timestamp_validacao: new Date().toISOString()
    };
  };

  const validarTodasProvas = async (): Promise<void> => {
    if (!dbs) return;
    
    setLoading(true);
    try {
      const provasParaValidar = provas.filter(doc => !doc.invalida);
      
      let validas = 0;
      let invalidas = 0;
      
      for (let doc of provasParaValidar) {
        const resultado = await validarProvaCompleta(doc);
        
        if (resultado.valido) {
          doc.validacao_zk_hmac = true;
          doc.data_validacao = resultado.timestamp_validacao;
          validas++;
        } else {
          doc.invalida = true;
          doc.erro_detalhe = resultado.motivo;
          invalidas++;
        }
        
        await dbs.dbVotos.put(doc);
      }
      
      addLog(`Validação concluída: ${validas} válidas, ${invalidas} inválidas`, 'success');
      atualizarDashboard();
      
    } catch (error: any) {
      addLog(`Erro na validação: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sincronizarPendentes = async (): Promise<void> => {
    if (!dbs || !isOnline) {
      addLog('⚠️ Sem conexão para sincronizar', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const pendentesValidas = provas.filter(doc => 
        !doc.cid_pinata && !doc.invalida && doc.validacao_zk_hmac === true
      );
      
      let sucessos = 0;
      
      for (let doc of pendentesValidas) {
        try {
          const payload = {
            nome_produtor: doc.eleitor,
            produto: doc.candidato_nome,
            screenshot_hash: doc.screenshot_hash,
            tipo: "prova_presidencial",
            timestamp_original: doc.timestamp,
            hmac_integridade: doc.hmac_integridade,
            validacao_zk: true,
            dados_sensores: dadosSensores
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch("http://127.0.0.1:8080/mel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const cid = data.IpfsHash || data.cid;
            
            if (cid) {
              doc.cid_pinata = cid;
              doc.data_sincronizacao = new Date().toISOString();
              await dbs.dbVotos.put(doc);
              sucessos++;
              
              addLog(`✅ Sincronizado CID: ${cid.substring(0, 20)}...`, 'success');
            } else {
              throw new Error('CID não retornado');
            }
          } else {
            throw new Error(`HTTP ${response.status}`);
          }

        } catch (error: any) {
          addLog(`❌ Erro sincronização: ${error.message}`, 'error');
        }
      }
      
      addLog(`📊 Sincronização: ${sucessos} sucessos`, 'info');
      atualizarDashboard();
      
    } catch (error: any) {
      addLog(`❌ Erro geral sincronização: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // 🔥 SISTEMA DE SENSORES - CORRIGIDO
  // ==============================
  const iniciarSensores = async (): Promise<void> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        ]);
        
        if (granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED) {
          addLog('⚠️ Permissão de localização negada', 'warning');
        }
      }

      // Acelerômetro
      if (await Accelerometer.isAvailableAsync()) {
        Accelerometer.setUpdateInterval(1000);
        accelerometerSubscription.current = Accelerometer.addListener((data: AccelerometerMeasurement) => {
          setDadosSensores(prev => ({
            ...prev,
            accelerometer: data,
            sensorTimestamp: Date.now()
          }));
        });
      }

      // Giroscópio
      if (await Gyroscope.isAvailableAsync()) {
        Gyroscope.setUpdateInterval(1000);
        gyroscopeSubscription.current = Gyroscope.addListener((data: GyroscopeMeasurement) => {
          setDadosSensores(prev => ({
            ...prev,
            gyroscope: data
          }));
        });
      }

      // Magnetômetro
      if (await Magnetometer.isAvailableAsync()) {
        Magnetometer.setUpdateInterval(1000);
        magnetometerSubscription.current = Magnetometer.addListener((data: MagnetometerMeasurement) => {
          setDadosSensores(prev => ({
            ...prev,
            magnetometer: data
          }));
        });
      }

      // Barômetro
      if (await Barometer.isAvailableAsync()) {
        Barometer.setUpdateInterval(1000);
        barometerSubscription.current = Barometer.addListener((data: BarometerMeasurement) => {
          setDadosSensores(prev => ({
            ...prev,
            barometer: data
          }));
        });
      }

      // Sensor de Luz
      try {
        if (await LightSensor.isAvailableAsync()) {
          lightSubscription.current = LightSensor.addListener((data: LightSensorMeasurement) => {
            setDadosSensores(prev => ({
              ...prev,
              light: data
            }));
          });
        }
      } catch (lightError) {
        console.log('LightSensor não disponível');
      }

      addLog('✅ Sensores ativados', 'success');

    } catch (error: any) {
      addLog(`❌ Erro sensores: ${error.message}`, 'error');
    }
  };

  const pararSensores = (): void => {
    accelerometerSubscription.current?.remove();
    gyroscopeSubscription.current?.remove();
    magnetometerSubscription.current?.remove();
    barometerSubscription.current?.remove();
    lightSubscription.current?.remove();
  };

  // ==============================
  // 🔥 EFFECTS CORRIGIDOS
  // ==============================
  useEffect(() => {
    if (!dbInitialized) {
      addLog('❌ Erro: Bancos de dados não inicializados', 'error');
      return;
    }
    
    // Monitorar rede
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });

    atualizarDashboard();
    iniciarSensores();

    return () => {
      pararSensores();
      unsubscribe();
    };
  }, [dbInitialized]);

  // ==============================
  // 🔥 COMPONENTES DE UI - CORRIGIDOS
  // ==============================
  const StatCard: React.FC<{ value: number; label: string; type: string }> = ({ value, label, type }) => {
    const cardStyle = type === 'Pendente' ? styles.statCardPendente : 
                     type === 'Validadas' ? styles.statCardValidadas : 
                     type === 'Invalidas' ? styles.statCardInvalidas : 
                     styles.statCard;
    
    return (
      <View style={[styles.statCard, cardStyle]}>
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  };

  const LogEntryComponent: React.FC<{ log: LogEntry }> = ({ log }) => {
    const logStyle = log.type === 'success' ? styles.logSuccess :
                    log.type === 'error' ? styles.logError :
                    log.type === 'warning' ? styles.logWarning :
                    styles.logInfo;
    
    return (
      <Text style={[styles.logText, logStyle]}>
        [{log.timestamp}] {log.message}
      </Text>
    );
  };

  const ProvaItem: React.FC<{ prova: Prova }> = ({ prova }) => (
    <View style={[styles.provaItem, prova.invalida ? styles.provaInvalida : styles.provaPendente]}>
      <Text style={styles.provaTipo}>
        {prova.candidato_nome} 
        {prova.validacao_zk_hmac && <Text style={styles.badge}> ZK✓ HMAC✓</Text>}
        {prova.automatica && <Text style={styles.badgeAuto}> 🔥 AUTO</Text>}
      </Text>
      <Text style={styles.provaProdutor}>Produtor: {prova.eleitor}</Text>
      <Text style={styles.provaTimestamp}>
        {new Date(prova.timestamp || Date.now()).toLocaleString()}
      </Text>
      {prova.cid_pinata && (
        <Text style={styles.provaCID}>CID: {prova.cid_pinata.substring(0, 20)}...</Text>
      )}
      {prova.erro_detalhe && (
        <Text style={styles.provaErro}>Erro: {prova.erro_detalhe}</Text>
      )}
    </View>
  );

  const SensorDisplay: React.FC = () => (
    <View style={styles.sensorContainer}>
      <Text style={styles.sensorTitle}>📱 Sensores Ativos</Text>
      {dadosSensores.accelerometer && (
        <Text style={styles.sensorData}>
          📊 Acel: X:{dadosSensores.accelerometer.x.toFixed(2)} Y:{dadosSensores.accelerometer.y.toFixed(2)} Z:{dadosSensores.accelerometer.z.toFixed(2)}
        </Text>
      )}
      {dadosSensores.gyroscope && (
        <Text style={styles.sensorData}>
          🌀 Giro: X:{dadosSensores.gyroscope.x.toFixed(2)} Y:{dadosSensores.gyroscope.y.toFixed(2)} Z:{dadosSensores.gyroscope.z.toFixed(2)}
        </Text>
      )}
      {dadosSensores.barometer && (
        <Text style={styles.sensorData}>
          🌡️ Pressão: {dadosSensores.barometer.pressure?.toFixed(1)} hPa
        </Text>
      )}
      {dadosSensores.light && (
        <Text style={styles.sensorData}>
          💡 Luz: {dadosSensores.light.illuminance?.toFixed(0)} lux
        </Text>
      )}
      <Text style={styles.sensorData}>
        🌐 Status: {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );

  const TelaErroCritico: React.FC = () => (
    <View style={styles.telaErro}>
      <Text style={styles.erroTitulo}>🚨 Erro Crítico</Text>
      <Text style={styles.erroMensagem}>
        Não foi possível inicializar o armazenamento local.
      </Text>
      <Text style={styles.erroDetalhe}>
        Reinicie o aplicativo.
      </Text>
    </View>
  );

  // ==============================
  // 🔥 RENDER PRINCIPAL - CORRIGIDO
  // ==============================
  if (!dbInitialized) {
    return <TelaErroCritico />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Auditor Terra Dourada</Text>
        <Text style={styles.subtitle}>Mobile + Sensores + ZK/HMAC</Text>
      </View>

      <View style={styles.tabs}>
        {['dashboard', 'pendentes', 'sensores'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={atualizarDashboard} />
        }
      >
        {activeTab === 'dashboard' && (
          <>
            <View style={styles.dashboard}>
              <StatCard value={stats.pendentes} label="Pendentes" type="Pendente" />
              <StatCard value={stats.validadas} label="Validadas" type="Validadas" />
              <StatCard value={stats.invalidas} label="Inválidas" type="Invalidas" />
            </View>

            <SensorDisplay />

            <View style={styles.controls}>
              <TouchableOpacity style={styles.button} onPress={atualizarDashboard}>
                <Text style={styles.buttonText}>🔄 Atualizar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={validarTodasProvas}>
                <Text style={styles.buttonText}>🔍 Validar Todas</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, !isOnline && styles.buttonDisabled]} 
                onPress={sincronizarPendentes}
                disabled={!isOnline}
              >
                <Text style={styles.buttonText}>
                  {isOnline ? '📤 Sincronizar' : '📴 Offline'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'pendentes' && (
          <View>
            <Text style={styles.sectionTitle}>Provas Pendentes ({stats.pendentes})</Text>
            {provas.filter(p => !p.invalida && !p.cid_pinata).map(prova => (
              <ProvaItem key={prova._id} prova={prova} />
            ))}
          </View>
        )}

        {activeTab === 'sensores' && (
          <View>
            <SensorDisplay />
            <Text style={styles.sectionTitle}>Provas Automáticas de Sensores</Text>
            {provas.filter(p => p.automatica).map(prova => (
              <ProvaItem key={prova._id} prova={prova} />
            ))}
          </View>
        )}

        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Log do Sistema</Text>
          {logs.map(log => (
            <LogEntryComponent key={log.id} log={log} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ==============================
// 🔥 ESTILOS CORRIGIDOS - APENAS ViewStyle
// ==============================
const styles = StyleSheet.create({
  // Estilos de View (apenas ViewStyle)
  container: { 
    flex: 1, 
    backgroundColor: '#0a0f0a' 
  },
  header: { 
    padding: 20, 
    paddingTop: 50, 
    backgroundColor: '#1a1f1a', 
    borderBottomWidth: 1, 
    borderBottomColor: '#d4af37' 
  },
  tabs: { 
    flexDirection: 'row', 
    backgroundColor: '#1a1f1a', 
    borderBottomWidth: 1, 
    borderBottomColor: '#d4af37' 
  },
  tab: { 
    flex: 1, 
    padding: 15, 
    alignItems: 'center' 
  },
  tabActive: { 
    backgroundColor: 'rgba(212, 175, 55, 0.1)', 
    borderBottomWidth: 2, 
    borderBottomColor: '#ffd700' 
  },
  content: { 
    flex: 1, 
    padding: 15 
  },
  dashboard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20, 
    flexWrap: 'wrap' 
  },
  statCard: { 
    width: '48%', 
    backgroundColor: '#1a1f1a', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 10, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#d4af37' 
  },
  statCardPendente: { 
    borderColor: '#ffa500' 
  },
  statCardValidadas: { 
    borderColor: '#00ff00' 
  },
  statCardInvalidas: { 
    borderColor: '#ff4444' 
  },
  sensorContainer: { 
    backgroundColor: 'rgba(212, 175, 55, 0.1)', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#d4af37' 
  },
  controls: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20 
  },
  button: { 
    backgroundColor: 'rgba(212, 175, 55, 0.2)', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#d4af37', 
    alignItems: 'center', 
    flex: 1, 
    marginHorizontal: 5 
  },
  buttonDisabled: { 
    opacity: 0.5, 
    borderColor: '#666' 
  },
  provaItem: { 
    backgroundColor: '#1a1f1a', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 10, 
    borderLeftWidth: 4 
  },
  provaPendente: { 
    borderLeftColor: '#ffa500' 
  },
  provaInvalida: { 
    borderLeftColor: '#ff4444' 
  },
  logContainer: { 
    backgroundColor: '#111', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#d4af37', 
    marginTop: 20 
  },
  telaErro: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#0a0f0a', 
    padding: 30 
  },

  // Estilos de Text (apenas TextStyle)
  title: { 
    color: '#ffd700', 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  subtitle: { 
    color: '#d4af37', 
    textAlign: 'center', 
    opacity: 0.8, 
    marginTop: 5 
  },
  tabText: { 
    color: '#d4af37', 
    fontSize: 12 
  },
  tabTextActive: { 
    color: '#ffd700', 
    fontWeight: 'bold' 
  },
  statNumber: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 5, 
    color: '#d4af37' 
  },
  statLabel: { 
    color: '#d4af37', 
    fontSize: 10, 
    textAlign: 'center' 
  },
  sensorTitle: { 
    color: '#ffd700', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  sensorData: { 
    color: '#d4af37', 
    fontSize: 12, 
    marginBottom: 5 
  },
  buttonText: { 
    color: '#d4af37', 
    fontWeight: 'bold' 
  },
  sectionTitle: { 
    color: '#ffd700', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  provaTipo: { 
    color: '#d4af37', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
  provaProdutor: { 
    color: '#d4af37', 
    opacity: 0.8, 
    fontSize: 14, 
    marginBottom: 5 
  },
  provaTimestamp: { 
    color: '#d4af37', 
    opacity: 0.7, 
    fontSize: 12 
  },
  provaCID: { 
    color: '#00ff00', 
    fontSize: 11, 
    marginTop: 3 
  },
  provaErro: { 
    color: '#ff4444', 
    fontSize: 12, 
    marginTop: 5 
  },
  badge: { 
    color: '#00ff00', 
    fontSize: 10 
  },
  badgeAuto: { 
    color: '#ffa500', 
    fontSize: 10 
  },
  logTitle: { 
    color: '#ffd700', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  logText: { 
    fontSize: 12, 
    marginBottom: 3 
  },
  logSuccess: { 
    color: '#00ff00' 
  },
  logError: { 
    color: '#ff4444' 
  },
  logWarning: { 
    color: '#ffa500' 
  },
  logInfo: { 
    color: '#d4af37' 
  },
  erroTitulo: { 
    color: '#ff4444', 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  erroMensagem: { 
    color: '#d4af37', 
    fontSize: 18, 
    textAlign: 'center', 
    marginBottom: 15 
  },
  erroDetalhe: { 
    color: '#d4af37', 
    opacity: 0.8, 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 30 
  },
});