// ExplorerScreen.tsx - VERSÃO CORRIGIDA (SEM KEYS DUPLICADAS)
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  Platform,
  Alert,
  Modal,
  Vibration
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as CryptoJS from 'crypto-js';

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
}

const initializeDB = () => {
  try {
    return {
      dbVotos: new AsyncStorageDB('app_votos_local'),
      dbAutorizacoes: new AsyncStorageDB('app_autorizacoes'),
      dbEleicoes: new AsyncStorageDB('app_eleicoes'),
      dbConfig: new AsyncStorageDB('app_config'),
      dbSensores: new AsyncStorageDB('app_sensores'),
      dbFilaEnvio: new AsyncStorageDB('app_fila_envio'),
      dbBackups: new AsyncStorageDB('app_backups'),
      dbMidias: new AsyncStorageDB('app_midias'),
      dbEventos: new AsyncStorageDB('app_eventos')
    };
  } catch (error) {
    console.error('Erro ao inicializar bancos:', error);
    return null;
  }
};

const dbs = initializeDB();

type Localizacao = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
};

type StatusEnvio = 'pendente' | 'enviando' | 'enviada' | 'arquivada' | 'falha';

type DadosSensoresNativos = {
  accelerometer?: AccelerometerMeasurement;
  gyroscope?: GyroscopeMeasurement;
  magnetometer?: MagnetometerMeasurement;
  barometer?: BarometerMeasurement;
  light?: LightSensorMeasurement;
  sensorTimestamp?: number;
};

type DispositivoBLE = {
  id: string;
  name: string | null;
  localName?: string | null;
  rssi: number | null;
  manufacturerData?: string | null;
  serviceUUIDs?: string[] | null;
  tipo?: 'temperatura' | 'umidade' | 'vibracao' | 'peso' | 'rfid' | 'porta' | 'desconhecido';
  ultimaLeitura?: any;
};

type EventoSensor = {
  tipo: 'impacto' | 'vibracao_excessiva' | 'temperatura_extrema' | 'porta_aberta' | 'movimento' | 'localizacao_alterada';
  sensor_origem: string;
  dados: any;
  timestamp: string;
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
};

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
  proveniencia?: string;
  hash_foto?: string;
  hash_video?: string;
  tipo_midia?: 'foto' | 'video' | 'nenhum';
  caminho_midia?: string;
  timestamp_midia?: string;
  midia_id?: string;
  localizacao?: Localizacao;
  endereco_aproximado?: string;
  hash_localizacao?: string;
  
  status_envio?: StatusEnvio;
  data_captura?: string;
  tentativas_envio?: number;
  ultimo_erro_envio?: string;
  
  dados_sensores_nativos?: DadosSensoresNativos;
  dispositivos_ble_detectados?: DispositivoBLE[];
  eventos_sensores?: EventoSensor[];
  modo_coleta?: 'manual' | 'automatico' | 'continuo';
  duracao_coleta?: number;
  
  [key: string]: any;
};

type Midia = {
  _id: string;
  tipo: 'foto' | 'video';
  caminho_arquivo: string;
  hash_sha256: string;
  timestamp: string;
  tamanho_bytes: number;
  resolucao?: string;
  duracao?: number;
  prova_associada?: string;
  metadata?: any;
};

type LogEntry = {
  id: string; // ALTERADO: agora é string para garantir unicidade
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
};

export default function ExplorerScreen() {
  const [provas, setProvas] = useState<Prova[]>([]);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [modalCamera, setModalCamera] = useState<boolean>(false);
  const [cameraTipo, setCameraTipo] = useState<'foto' | 'video'>('foto');
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [gravandoVideo, setGravandoVideo] = useState<boolean>(false);
  const [permissaoCamera, setPermissaoCamera] = useState<boolean>(false);
  const [ultimoHashMidia, setUltimoHashMidia] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'captura' | 'sensores' | 'eventos'>('captura');
  
  const [dadosSensores, setDadosSensores] = useState<DadosSensoresNativos>({});
  const [dispositivosBLE, setDispositivosBLE] = useState<DispositivoBLE[]>([]);
  const [eventosSensores, setEventosSensores] = useState<EventoSensor[]>([]);
  const [modoColeta, setModoColeta] = useState<'manual' | 'automatico' | 'continuo'>('manual');
  const [coletandoSensores, setColetandoSensores] = useState<boolean>(false);
  const [tempoColeta, setTempoColeta] = useState<number>(0);
  
  const [stats, setStats] = useState({
    total_provas: 0,
    provas_com_midia: 0,
    midias_armazenadas: 0,
    backups_realizados: 0,
    provas_com_gps: 0,
    provas_pendentes: 0,
    provas_arquivadas: 0,
    provas_enviadas: 0,
    total_eventos: 0,
    eventos_impacto: 0,
    eventos_temperatura: 0,
    dispositivos_detectados: 0
  });

  const accelerometerSubscription = useRef<{ remove: () => void } | null>(null);
  const gyroscopeSubscription = useRef<{ remove: () => void } | null>(null);
  const magnetometerSubscription = useRef<{ remove: () => void } | null>(null);
  const barometerSubscription = useRef<{ remove: () => void } | null>(null);
  const lightSubscription = useRef<{ remove: () => void } | null>(null);
 
  const coletaInterval = useRef<number | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const HMAC_SECRET = "app_secret_key_production";

  // ✅ CORREÇÃO: Garantir IDs únicos para logs
  const addLog = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`; // ID único garantido
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp, id }]);
  };

  const verificarBanco = (): boolean => {
    if (!dbs) {
      addLog('Banco de dados não inicializado', 'error');
      return false;
    }
    return true;
  };

  const iniciarSensoresNativos = async (): Promise<void> => {
    try {
      let sensoresAtivos = 0;

      if (await Accelerometer.isAvailableAsync()) {
        sensoresAtivos++;
        Accelerometer.setUpdateInterval(500);
        accelerometerSubscription.current = Accelerometer.addListener((data: AccelerometerMeasurement) => {
          setDadosSensores(prev => ({
            ...prev,
            accelerometer: data,
            sensorTimestamp: Date.now()
          }));
          
          const forcaImpacto = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
          if (forcaImpacto > 15.0) {
            registrarEventoSensor({
              tipo: 'impacto',
              sensor_origem: 'accelerometer',
              dados: { forca: forcaImpacto, dados: data },
              timestamp: new Date().toISOString(),
              gravidade: forcaImpacto > 25.0 ? 'critica' : 'alta'
            });
            
            Vibration.vibrate(500);
            addLog(`Impacto detectado: ${forcaImpacto.toFixed(2)}G`, 'warning');
          }
        });
        addLog('Acelerômetro ativado', 'info');
      }

      if (await Gyroscope.isAvailableAsync()) {
        sensoresAtivos++;
        Gyroscope.setUpdateInterval(1000);
        gyroscopeSubscription.current = Gyroscope.addListener((data: GyroscopeMeasurement) => {
          setDadosSensores(prev => ({ ...prev, gyroscope: data }));
        });
        addLog('Giroscópio ativado', 'info');
      }

      if (await Magnetometer.isAvailableAsync()) {
        sensoresAtivos++;
        Magnetometer.setUpdateInterval(1000);
        magnetometerSubscription.current = Magnetometer.addListener((data: MagnetometerMeasurement) => {
          setDadosSensores(prev => ({ ...prev, magnetometer: data }));
        });
        addLog('Magnetômetro ativado', 'info');
      }

      if (await Barometer.isAvailableAsync()) {
        sensoresAtivos++;
        Barometer.setUpdateInterval(2000);
        barometerSubscription.current = Barometer.addListener((data: BarometerMeasurement) => {
          setDadosSensores(prev => ({ ...prev, barometer: data }));
        });
        addLog('Barômetro ativado', 'info');
      }

      if (await LightSensor.isAvailableAsync()) {
        sensoresAtivos++;
        lightSubscription.current = LightSensor.addListener((data: LightSensorMeasurement) => {
          setDadosSensores(prev => ({ ...prev, light: data }));
        });
        addLog('Sensor de luz ativado', 'info');
      }

      

      addLog(`${sensoresAtivos} sensores nativos ativados`, 'success');
      
    } catch (error: any) {
      addLog(`Erro sensores nativos: ${error.message}`, 'error');
    }
  };

  const detectarDispositivosBLE = async (): Promise<void> => {
    try {
      // Limpa a lista de dispositivos (sem dados simulados)
      setDispositivosBLE([]);
      addLog('Escaneamento BLE: aguardando integração com biblioteca BLE', 'info');
    } catch (error: any) {
      addLog(`Erro detecção BLE: ${error.message}`, 'error');
    }
  };

  const registrarEventoSensor = async (evento: EventoSensor): Promise<void> => {
    if (!verificarBanco()) return;

    try {
      await dbs!.dbEventos.put({
        _id: `evento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...evento
      });

      setEventosSensores(prev => [...prev.slice(-19), evento]);

      if (evento.gravidade === 'critica' || evento.gravidade === 'alta') {
        await criarProvaAutomatica(evento);
      }

      addLog(`Evento: ${evento.tipo} (${evento.gravidade})`, 'warning');
    } catch (error: any) {
      addLog(`Erro registrar evento: ${error.message}`, 'error');
    }
  };

  const criarProvaAutomatica = async (evento: EventoSensor): Promise<void> => {
    if (!verificarBanco()) return;

    try {
      const localizacaoData = await capturarLocalizacao();
      
      const hashEvento = CryptoJS.SHA256(
        `${evento.tipo}_${evento.timestamp}_${JSON.stringify(evento.dados)}`
      ).toString();

      const provaAutomatica: Prova = {
        _id: `prova_auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eleitor: "Sistema_Automático",
        candidato_id: "evento_sensor",
        candidato_nome: `Evento: ${evento.tipo} - ${evento.gravidade}`,
        timestamp: Date.now(),
        screenshot_hash: hashEvento,
        eleicao_id: "monitoramento_iot",
        automatica: true,
        proveniencia: "sensor_automático",
        tipo_midia: 'nenhum',
        localizacao: localizacaoData.localizacao || undefined,
        endereco_aproximado: localizacaoData.localizacao ? localizacaoData.endereco_aproximado : undefined,
        hash_localizacao: localizacaoData.localizacao ? localizacaoData.hash_localizacao : undefined,
        
        status_envio: 'pendente',
        data_captura: new Date().toISOString(),
        dados_sensores_nativos: { ...dadosSensores },
        dispositivos_ble_detectados: [...dispositivosBLE],
        eventos_sensores: [evento],
        modo_coleta: 'automatico',
        duracao_coleta: 0
      };

      const validacaoHMAC = validarHMAC(provaAutomatica);
      if (validacaoHMAC.hmac_calculado) {
        provaAutomatica.hmac_integridade = validacaoHMAC.hmac_calculado;
      }

      const validacaoZK = validarZK(provaAutomatica);
      provaAutomatica.validacao_zk_hmac = validacaoZK.valido;

      await dbs!.dbVotos.put(provaAutomatica);
      
      addLog(`Prova automática criada: ${evento.tipo}`, 'success');
      carregarDadosExplorer();

    } catch (error: any) {
      addLog(`Erro prova automática: ${error.message}`, 'error');
    }
  };

  const iniciarColetaContinua = async (): Promise<void> => {
    if (coletandoSensores) {
      pararColetaContinua();
      return;
    }

    setColetandoSensores(true);
    setModoColeta('continuo');
    setTempoColeta(0);

    coletaInterval.current = setInterval(() => {
      setTempoColeta(prev => prev + 1);
    }, 1000) as unknown as number;

    addLog('Coleta contínua iniciada', 'success');
    Vibration.vibrate(200);
  };

  const pararColetaContinua = (): void => {
    if (coletaInterval.current) {
      clearInterval(coletaInterval.current);
      coletaInterval.current = null;
    }
    
    setColetandoSensores(false);
    setModoColeta('manual');
    
    criarProvaColetaContinua();
    
    addLog('Coleta contínua finalizada', 'info');
    Vibration.vibrate(200);
  };

  const criarProvaColetaContinua = async (): Promise<void> => {
    if (!verificarBanco()) return;

    try {
      const localizacaoData = await capturarLocalizacao();
      const hashColeta = CryptoJS.SHA256(`coleta_continua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).toString();

      const provaColeta: Prova = {
        _id: `prova_coleta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eleitor: "Sistema",
        candidato_id: "coleta_continua",
        candidato_nome: `Coleta Contínua - ${tempoColeta}s`,
        timestamp: Date.now(),
        screenshot_hash: hashColeta,
        eleicao_id: "telemetria",
        automatica: true,
        proveniencia: "coleta_continua",
        tipo_midia: 'nenhum',
        localizacao: localizacaoData.localizacao || undefined,
        endereco_aproximado: localizacaoData.localizacao ? localizacaoData.endereco_aproximado : undefined,
        hash_localizacao: localizacaoData.localizacao ? localizacaoData.hash_localizacao : undefined,
        
        status_envio: 'pendente',
        data_captura: new Date().toISOString(),
        dados_sensores_nativos: { ...dadosSensores },
        dispositivos_ble_detectados: [...dispositivosBLE],
        eventos_sensores: [...eventosSensores],
        modo_coleta: 'continuo',
        duracao_coleta: tempoColeta
      };

      const validacaoHMAC = validarHMAC(provaColeta);
      if (validacaoHMAC.hmac_calculado) {
        provaColeta.hmac_integridade = validacaoHMAC.hmac_calculado;
      }

      const validacaoZK = validarZK(provaColeta);
      provaColeta.validacao_zk_hmac = validacaoZK.valido;

      await dbs!.dbVotos.put(provaColeta);
      
      addLog(`Prova de coleta criada: ${tempoColeta}s de dados`, 'success');
      carregarDadosExplorer();

    } catch (error: any) {
      addLog(`Erro prova coleta: ${error.message}`, 'error');
    }
  };

  const coletarSensoresManualmente = async (): Promise<void> => {
    setModoColeta('manual');
    
    try {
      const localizacaoData = await capturarLocalizacao();
      const hashManual = CryptoJS.SHA256(`coleta_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).toString();

      const provaManual: Prova = {
        _id: `prova_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eleitor: "Operador",
        candidato_id: "coleta_manual",
        candidato_nome: "Coleta Manual de Sensores",
        timestamp: Date.now(),
        screenshot_hash: hashManual,
        eleicao_id: "monitoramento_manual",
        automatica: false,
        proveniencia: "coleta_manual",
        tipo_midia: 'nenhum',
        localizacao: localizacaoData.localizacao || undefined,
        endereco_aproximado: localizacaoData.localizacao ? localizacaoData.endereco_aproximado : undefined,
        hash_localizacao: localizacaoData.localizacao ? localizacaoData.hash_localizacao : undefined,
        
        status_envio: 'pendente',
        data_captura: new Date().toISOString(),
        dados_sensores_nativos: { ...dadosSensores },
        dispositivos_ble_detectados: [...dispositivosBLE],
        eventos_sensores: [...eventosSensores.slice(-5)],
        modo_coleta: 'manual',
        duracao_coleta: 0
      };

      const validacaoHMAC = validarHMAC(provaManual);
      if (validacaoHMAC.hmac_calculado) {
        provaManual.hmac_integridade = validacaoHMAC.hmac_calculado;
      }

      const validacaoZK = validarZK(provaManual);
      provaManual.validacao_zk_hmac = validacaoZK.valido;

      await dbs!.dbVotos.put(provaManual);
      
      addLog('Coleta manual de sensores realizada', 'success');
      Vibration.vibrate(200);
      carregarDadosExplorer();

    } catch (error: any) {
      addLog(`Erro coleta manual: ${error.message}`, 'error');
    }
  };

  const calcularHashArquivo = async (uri: string): Promise<string> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Arquivo não encontrado');
      }

      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      
      return CryptoJS.SHA256(fileContent).toString();
    } catch (error: any) {
      addLog(`Erro ao calcular hash: ${error.message}`, 'error');
      throw error;
    }
  };

  const capturarLocalizacao = async (): Promise<{
    localizacao: Localizacao | null;
    endereco_aproximado: string;
    hash_localizacao: string;
  }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        addLog('GPS não permitido pelo usuário', 'info');
        return { localizacao: null, endereco_aproximado: 'Permissão negada', hash_localizacao: 'sem_localizacao' };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const localizacao: Localizacao = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || null,
        altitude: location.coords.altitude || null,
        heading: location.coords.heading || null,
        speed: location.coords.speed || null
      };

      const hash_localizacao = CryptoJS.SHA256(
        `${localizacao.latitude},${localizacao.longitude},${localizacao.heading},${localizacao.speed}`
      ).toString();

      let endereco_aproximado = 'Endereço não disponível';
      try {
        const enderecos = await Location.reverseGeocodeAsync(localizacao);
        if (enderecos.length > 0) {
          const endereco = enderecos[0];
          endereco_aproximado = `${endereco.street || ''}, ${endereco.city || ''}, ${endereco.region || ''}`.trim();
          if (endereco_aproximado.endsWith(',')) {
            endereco_aproximado = endereco_aproximado.slice(0, -1);
          }
        }
      } catch (geoError) {
        addLog('Geocoding falhou', 'warning');
      }

      return {
        localizacao,
        endereco_aproximado,
        hash_localizacao
      };
    } catch (error: any) {
      addLog(`Erro ao capturar localização: ${error.message}`, 'error');
      return { localizacao: null, endereco_aproximado: 'Erro na captura', hash_localizacao: 'erro_localizacao' };
    }
  };

  const solicitarPermissaoCamera = async (): Promise<boolean> => {
    try {
      if (!permission) {
        const result = await requestPermission();
        setPermissaoCamera(result.granted);
        return result.granted;
      }
      
      if (!permission.granted) {
        const result = await requestPermission();
        setPermissaoCamera(result.granted);
        return result.granted;
      }
      
      setPermissaoCamera(true);
      return true;
    } catch (error: any) {
      addLog(`Erro permissão câmera: ${error.message}`, 'error');
      return false;
    }
  };

  const validarHMAC = (provaData: Prova): { 
    valido: boolean; 
    motivo: string; 
    hmac_calculado?: string 
  } => {
    try {
      const hashLocalizacao = provaData.localizacao
        ? CryptoJS.SHA256(
            `${provaData.localizacao.latitude},${provaData.localizacao.longitude},${provaData.localizacao.heading},${provaData.localizacao.speed}`
          ).toString()
        : "sem_localizacao";

      const hashSensores = provaData.dados_sensores_nativos
        ? CryptoJS.SHA256(JSON.stringify(provaData.dados_sensores_nativos)).toString().substring(0, 16)
        : "sem_sensores";

      const dadosParaHash = {
        eleitor: provaData.eleitor,
        candidato_id: provaData.candidato_id,
        timestamp: provaData.timestamp,
        eleicao_id: provaData.eleicao_id,
        hash_midia: provaData.tipo_midia === 'foto' ? provaData.hash_foto : provaData.hash_video,
        hash_localizacao: hashLocalizacao,
        hash_sensores: hashSensores,
        modo_coleta: provaData.modo_coleta
      };
      
      const dadosString = JSON.stringify(dadosParaHash);
      const hmacCalculado = CryptoJS.HmacSHA256(dadosString, HMAC_SECRET).toString();
      
      if (provaData.hmac_integridade) {
        const hmacValido = provaData.hmac_integridade === hmacCalculado;
        return {
          valido: hmacValido,
          motivo: hmacValido ? "HMAC válido" : "HMAC inválido",
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

  const validarZK = (provaData: Prova): { valido: boolean; motivo: string } => {
    try {
      const requiredFields = ['eleitor', 'candidato_id', 'timestamp', 'screenshot_hash'];
      const hasAllFields = requiredFields.every(field => provaData[field]);
      
      if (!hasAllFields) {
        return { valido: false, motivo: "Campos obrigatórios faltando" };
      }

      const hashRegex = /^[a-f0-9]{64}$/;
      const hashValido = hashRegex.test(provaData.screenshot_hash || '');
      
      if (!hashValido) {
        return { valido: false, motivo: "Hash inválido" };
      }

      const powValid = (provaData.screenshot_hash || '').startsWith('00');
      
      return { 
        valido: powValid, 
        motivo: powValid ? "Proof-of-Work válido" : "Proof-of-Work inválido"
      };
    } catch (error: any) {
      return { valido: false, motivo: `Erro validação: ${error.message}` };
    }
  };

  const adicionarFilaEnvio = async (prova: Prova, enviarAgora: boolean = false): Promise<void> => {
    if (!verificarBanco()) return;
    
    try {
      if (enviarAgora) {
        prova.status_envio = 'enviando';
        prova.tentativas_envio = (prova.tentativas_envio || 0) + 1;
        await dbs!.dbVotos.put(prova);
        
        await tentarEnvioImediato(prova);
      } else {
        const itemFila = {
          _id: `fila_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          prova: prova,
          tentativas: 0,
          em_processamento: false,
          timestamp_criacao: new Date().toISOString()
        };
        
        await dbs!.dbFilaEnvio.put(itemFila);
        addLog('Item adicionado à fila de envio', 'info');
      }
    } catch (error: any) {
      addLog(`Erro ao adicionar à fila: ${error.message}`, 'error');
    }
  };

  const tentarEnvioImediato = async (prova: Prova): Promise<void> => {
    if (!verificarBanco()) return;
    
    try {
      const payload = {
        nome_produtor: prova.eleitor,
        produto: prova.candidato_nome,
        screenshot_hash: prova.screenshot_hash,
        tipo: "prova_sensores",
        timestamp_original: prova.timestamp,
        hmac_integridade: prova.hmac_integridade,
        validacao_zk: prova.validacao_zk_hmac,
        dados_sensores: {
          nativos: prova.dados_sensores_nativos,
          ble: prova.dispositivos_ble_detectados,
          eventos: prova.eventos_sensores,
          localizacao: prova.localizacao,
          modo_coleta: prova.modo_coleta,
          duracao_coleta: prova.duracao_coleta
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("https://api.example.com/data", {
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
          prova.cid_pinata = cid;
          prova.data_sincronizacao = new Date().toISOString();
          prova.status_envio = 'enviada';
          await dbs!.dbVotos.put(prova);
          
          addLog(`Dados enviados! CID: ${cid.substring(0, 20)}...`, 'success');
        } else {
          throw new Error('CID não retornado');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error: any) {
      prova.status_envio = 'falha';
      prova.ultimo_erro_envio = error.message;
      prova.tentativas_envio = (prova.tentativas_envio || 0) + 1;
      await dbs!.dbVotos.put(prova);
      
      addLog(`Falha no envio: ${error.message}`, 'error');
    }
  };

  const processarMidiaCapturada = async (uri: string, tipo: 'foto' | 'video'): Promise<void> => {
    if (!verificarBanco()) return;
    
    setLoading(true);
    try {
      const hashMidia = await calcularHashArquivo(uri);
      setUltimoHashMidia(hashMidia);
      
      const localizacaoData = await capturarLocalizacao();
      
      const provaComSensores = await salvarProvaLocalmente(
        uri, 
        tipo, 
        hashMidia, 
        localizacaoData,
        { ...dadosSensores },
        [...dispositivosBLE],
        [...eventosSensores.slice(-3)]
      );
      
      Alert.alert(
        'Captura Concluída!',
        `Mídia + Dados de ${dispositivosBLE.length} sensores capturados!`,
        [
          {
            text: 'Enviar Tudo',
            onPress: () => {
              addLog('Enviando mídia + dados sensores...', 'info');
              adicionarFilaEnvio(provaComSensores, true);
            }
          },
          {
            text: 'Salvar Local',
            onPress: () => {
              provaComSensores.status_envio = 'arquivada';
              dbs!.dbVotos.put(provaComSensores);
              addLog('Prova com sensores arquivada', 'success');
            }
          }
        ]
      );
      
      await carregarDadosExplorer();
      
    } catch (error: any) {
      addLog(`Erro processar ${tipo}: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const salvarProvaLocalmente = async (
    uri: string, 
    tipo: 'foto' | 'video', 
    hashMidia: string,
    localizacaoData: any,
    dadosSensores: DadosSensoresNativos,
    dispositivosBLE: DispositivoBLE[],
    eventosSensores: EventoSensor[]
  ): Promise<Prova> => {
    if (!dbs) throw new Error('Banco não inicializado');

    const fileInfo = await FileSystem.getInfoAsync(uri);
    let fileSize = 0;
    
    if (fileInfo.exists && 'size' in fileInfo) {
      fileSize = fileInfo.size as number;
    }
    
    const midia: Midia = {
      _id: `midia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo: tipo,
      caminho_arquivo: uri,
      hash_sha256: hashMidia,
      timestamp: new Date().toISOString(),
      tamanho_bytes: fileSize,
      metadata: {
        dispositivo: Platform.OS,
        sensores_ativos: Object.keys(dadosSensores).length,
        dispositivos_ble: dispositivosBLE.length
      }
    };
    
    await dbs.dbMidias.put(midia);
    
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch (saveError) {
      // Ignora erro de galeria
    }
    
    const novaProva: Prova = {
      _id: `prova_midia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eleitor: "Operador",
      candidato_id: "evidencia_completa",
      candidato_nome: `Prova com ${tipo} + ${dispositivosBLE.length} sensores`,
      timestamp: Date.now(),
      screenshot_hash: hashMidia,
      eleicao_id: "sensores_iot",
      automatica: false,
      proveniencia: "explorer_sensores",
      hash_foto: tipo === 'foto' ? hashMidia : undefined,
      hash_video: tipo === 'video' ? hashMidia : undefined,
      tipo_midia: tipo,
      caminho_midia: uri,
      timestamp_midia: new Date().toISOString(),
      midia_id: midia._id,
      localizacao: localizacaoData.localizacao || undefined,
      endereco_aproximado: localizacaoData.localizacao ? localizacaoData.endereco_aproximado : undefined,
      hash_localizacao: localizacaoData.localizacao ? localizacaoData.hash_localizacao : undefined,
      
      status_envio: 'pendente',
      data_captura: new Date().toISOString(),
      tentativas_envio: 0,
      
      dados_sensores_nativos: dadosSensores,
      dispositivos_ble_detectados: dispositivosBLE,
      eventos_sensores: eventosSensores,
      modo_coleta: 'manual',
      duracao_coleta: 0
    };
    
    const validacaoHMAC = validarHMAC(novaProva);
    if (validacaoHMAC.hmac_calculado) {
      novaProva.hmac_integridade = validacaoHMAC.hmac_calculado;
    }
    
    const validacaoZK = validarZK(novaProva);
    novaProva.validacao_zk_hmac = validacaoZK.valido;
    
    await dbs.dbVotos.put(novaProva);
    
    addLog(`${tipo.toUpperCase()} + ${dispositivosBLE.length} sensores salvos!`, 'success');
    
    return novaProva;
  };

  const pararGravacao = async (): Promise<void> => {
    if (cameraRef && gravandoVideo) {
      try {
        await cameraRef.stopRecording();
        setGravandoVideo(false);
      } catch (error: any) {
        addLog(`Erro ao parar gravação: ${error.message}`, 'error');
      }
    }
  };

  const capturarMidiaEProva = async (tipo: 'foto' | 'video'): Promise<void> => {
    const permissao = await solicitarPermissaoCamera();
    if (!permissao) {
      Alert.alert('Permissão Negada', 'Não é possível usar a câmera sem permissão.');
      return;
    }

    setCameraTipo(tipo);
    setModalCamera(true);
  };

  const tirarFoto = async (): Promise<void> => {
    if (!cameraRef) return;
    
    try {
      const foto = await cameraRef.takePictureAsync();
      
      if (foto) {
        await processarMidiaCapturada(foto.uri, 'foto');
        setModalCamera(false);
      }
    } catch (error: any) {
      addLog(`Erro ao tirar foto: ${error.message}`, 'error');
    }
  };

  const iniciarGravacao = async (): Promise<void> => {
    if (!cameraRef || gravandoVideo) return;
    
    try {
      setGravandoVideo(true);
      
      const video = await cameraRef.recordAsync({
        maxDuration: 10,
      });
      
      if (video) {
        await processarMidiaCapturada(video.uri, 'video');
        setGravandoVideo(false);
        setModalCamera(false);
      }
    } catch (error: any) {
      addLog(`Erro ao gravar vídeo: ${error.message}`, 'error');
      setGravandoVideo(false);
    }
  };

  const carregarDadosExplorer = async (): Promise<void> => {
    if (!verificarBanco()) return;
    
    setLoading(true);
    try {
      const [provasData, midiasData, backupsData, eventosData] = await Promise.all([
        dbs!.dbVotos.allDocs({ include_docs: true }),
        dbs!.dbMidias.allDocs({ include_docs: true }),
        dbs!.dbBackups.allDocs({ include_docs: true }),
        dbs!.dbEventos.allDocs({ include_docs: true })
      ]);
      
      // TODAS as provas, não apenas as com mídia
      const todasProvas = provasData.rows.map((row: any) => row.doc);
      
      // Provas FILTRADAS (apenas as que têm mídia) para a lista
      const provasComMidia = todasProvas.filter((prova: Prova) => prova.tipo_midia);
      
      // Para estatísticas, use TODAS as provas
      const provasComGPS = todasProvas.filter((prova: Prova) => prova.localizacao);
      const provasComSensores = todasProvas.filter((prova: Prova) => prova.dados_sensores_nativos);

      const eventos = eventosData.rows.map((row: any) => row.doc);
      const eventosImpacto = eventos.filter((e: EventoSensor) => e.tipo === 'impacto');
      const eventosTemperatura = eventos.filter((e: EventoSensor) => e.tipo === 'temperatura_extrema');

      const provasPendentes = todasProvas.filter((p: Prova) => p.status_envio === 'pendente');
      const provasArquivadas = todasProvas.filter((p: Prova) => p.status_envio === 'arquivada');
      const provasEnviadas = todasProvas.filter((p: Prova) => p.status_envio === 'enviada');

      // A lista de provas que aparece na UI deve ser apenas as que têm mídia
      setProvas(provasComMidia);
      setMidias(midiasData.rows.map((row: any) => row.doc));
      setEventosSensores(eventos.slice(-10));
      
      // CORRIGIDO: use todasProvas.length para o total real
      setStats({
        total_provas: todasProvas.length,  // Agora mostra o total REAL
        provas_com_midia: provasComMidia.length,
        midias_armazenadas: midiasData.rows.length,
        backups_realizados: backupsData.rows.length,
        provas_com_gps: provasComGPS.length,
        provas_pendentes: provasPendentes.length,
        provas_arquivadas: provasArquivadas.length,
        provas_enviadas: provasEnviadas.length,
        total_eventos: eventos.length,
        eventos_impacto: eventosImpacto.length,
        eventos_temperatura: eventosTemperatura.length,
        dispositivos_detectados: 0  // SEMPRE 0 porque não temos BLE real
      });
      
      addLog('Explorer atualizado', 'success');
      
    } catch (error: any) {
      addLog(`Erro carregar explorer: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dbs) {
      addLog('Erro: Bancos não inicializados', 'error');
      return;
    }
    
    iniciarSensoresNativos();
    detectarDispositivosBLE();
    carregarDadosExplorer();

    return () => {
      accelerometerSubscription.current?.remove();
      gyroscopeSubscription.current?.remove();
      magnetometerSubscription.current?.remove();
      barometerSubscription.current?.remove();
      lightSubscription.current?.remove();
  
      
      if (coletaInterval.current) {
        clearInterval(coletaInterval.current);
      }
    };
  }, []);

  // ✅ CORREÇÃO: SensorDisplay com keys únicas
  const SensorDisplay: React.FC = () => {
    const sensoresAtivos = Object.keys(dadosSensores).filter(key => 
      key !== 'sensorTimestamp' && dadosSensores[key as keyof DadosSensoresNativos] !== undefined
    );
    
    return (
      <View style={styles.sensorContainer}>
        <Text key="sensor-title" style={styles.sensorTitle}>
          {sensoresAtivos.length > 0 ? `${sensoresAtivos.length} Sensores Ativos` : 'Nenhum Sensor Ativo'}
        </Text>
        
        <View key="sensor-group-1" style={styles.sensorGroup}>
          <Text key="group-title-1" style={styles.sensorGroupTitle}>Sensores Nativos</Text>
          {dadosSensores.accelerometer ? (
            <Text key="accelerometer-data" style={styles.sensorData}>
              📱 Acelerômetro: {Math.sqrt(
                dadosSensores.accelerometer.x ** 2 + 
                dadosSensores.accelerometer.y ** 2 + 
                dadosSensores.accelerometer.z ** 2
              ).toFixed(2)}G
            </Text>
          ) : (
            <Text key="accelerometer-inactive" style={styles.sensorDataInactive}>
              📱 Acelerômetro: Não disponível
            </Text>
          )}
          
          {dadosSensores.barometer ? (
            <Text key="barometer-data" style={styles.sensorData}>
              🌡️ Pressão: {dadosSensores.barometer.pressure?.toFixed(1)} hPa
            </Text>
          ) : null}
          
          {dadosSensores.light ? (
            <Text key="light-data" style={styles.sensorData}>
              💡 Luz: {dadosSensores.light.illuminance?.toFixed(0)} lux
            </Text>
          ) : null}
          
          
          
          {sensoresAtivos.length === 0 && (
            <Text key="no-sensors" style={styles.sensorDataInactive}>
              Nenhum sensor nativo disponível neste dispositivo
            </Text>
          )}
        </View>

        <View key="sensor-group-2" style={styles.sensorGroup}>
          <Text key="group-title-2" style={styles.sensorGroupTitle}>Bluetooth BLE</Text>
          <Text key="ble-info-1" style={styles.sensorDataInactive}>
            🔍 Biblioteca BLE não integrada
          </Text>
          <Text key="ble-info-2" style={styles.sensorDataInactive}>
            (Use react-native-ble-plx para conectar a dispositivos reais)
          </Text>
        </View>

        <View key="sensor-group-3" style={styles.sensorGroup}>
          <Text key="group-title-3" style={styles.sensorGroupTitle}>Eventos Detectados</Text>
          {eventosSensores.length > 0 ? (
            eventosSensores.slice(0, 2).map((evento, index) => (
              <Text key={`event-display-${evento.timestamp}-${index}`} style={styles.sensorData}>
                {getEventIcon(evento.tipo)} {evento.tipo} ({evento.gravidade})
              </Text>
            ))
          ) : (
            <Text key="no-events" style={styles.sensorDataInactive}>
              ✅ Nenhum evento detectado
            </Text>
          )}
        </View>

        <View key="sensor-group-4" style={styles.sensorGroup}>
          <Text key="group-title-4" style={styles.sensorGroupTitle}>Modo de Coleta</Text>
          <Text key="collection-mode" style={styles.sensorData}>
            {modoColeta === 'continuo' ? '🚚' : '👤'} {modoColeta.toUpperCase()}
            {coletandoSensores && ` - ${tempoColeta}s`}
          </Text>
        </View>
      </View>
    );
  };

  const getEventIcon = (tipo: EventoSensor['tipo']): string => {
    switch (tipo) {
      case 'impacto': return '💥';
      case 'vibracao_excessiva': return '📳';
      case 'temperatura_extrema': return '🌡️';
      case 'porta_aberta': return '🚪';
      case 'movimento': return '🏃';
      case 'localizacao_alterada': return '📍';
      default: return '⚡';
    }
  };

  const SensorControls: React.FC = () => (
    <View style={styles.controlsSection}>
      <Text style={styles.sectionTitle}>Coleta de Sensores</Text>
      
      <View style={styles.sensorControlsGrid}>
        <TouchableOpacity 
          style={[styles.sensorControlButton, styles.manualButton]}
          onPress={coletarSensoresManualmente}
        >
          <Text style={styles.sensorControlIcon}>📊</Text>
          <Text style={styles.sensorControlLabel}>Coletar Agora</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.sensorControlButton, 
            styles.truckButton,
            coletandoSensores && styles.activeButton
          ]}
          onPress={iniciarColetaContinua}
        >
          <Text style={styles.sensorControlIcon}>
            {coletandoSensores ? '🛑' : '🚚'}
          </Text>
          <Text style={styles.sensorControlLabel}>
            {coletandoSensores ? 'Parar' : 'Contínuo'}
          </Text>
          {coletandoSensores && (
            <Text style={styles.timerText}>{tempoColeta}s</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sensorControlButton, styles.cameraButton]}
          onPress={() => capturarMidiaEProva('foto')}
        >
          <Text style={styles.sensorControlIcon}>📸</Text>
          <Text style={styles.sensorControlLabel}>Foto + Sensores</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ExplorerStats: React.FC = () => (
    <View key="explorer-stats" style={styles.statsContainer}>
      <Text key="stats-title" style={styles.statsTitle}>Dashboard IoT</Text>
      
      <View key="stats-grid" style={styles.statsGrid}>
        <View key="stat-total-provas" style={styles.statItem}>
          <Text key="stat-total-number" style={styles.statNumber}>{stats.total_provas}</Text>
          <Text key="stat-total-label" style={styles.statLabel}>Provas</Text>
        </View>
        
        <View key="stat-sensores" style={styles.statItem}>
          <Text key="stat-sensores-number" style={styles.statNumber}>{stats.dispositivos_detectados}</Text>
          <Text key="stat-sensores-label" style={styles.statLabel}>Sensores</Text>
        </View>
        
        <View key="stat-eventos" style={styles.statItem}>
          <Text key="stat-eventos-number" style={styles.statNumber}>{stats.total_eventos}</Text>
          <Text key="stat-eventos-label" style={styles.statLabel}>Eventos</Text>
        </View>

        <View key="stat-impactos" style={styles.statItem}>
          <Text key="stat-impactos-number" style={styles.statNumber}>{stats.eventos_impacto}</Text>
          <Text key="stat-impactos-label" style={styles.statLabel}>Impactos</Text>
        </View>
      </View>
    </View>
  );

  const ExplorerTabs: React.FC = () => (
    <View key="explorer-tabs" style={styles.tabsContainer}>
      <TouchableOpacity 
        key="tab-captura"
        style={[styles.tab, activeTab === 'captura' && styles.tabActive]}
        onPress={() => setActiveTab('captura')}
      >
        <Text style={[styles.tabText, activeTab === 'captura' && styles.tabTextActive]}>
          Captura
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        key="tab-sensores"
        style={[styles.tab, activeTab === 'sensores' && styles.tabActive]}
        onPress={() => setActiveTab('sensores')}
      >
        <Text style={[styles.tabText, activeTab === 'sensores' && styles.tabTextActive]}>
          Sensores
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        key="tab-eventos"
        style={[styles.tab, activeTab === 'eventos' && styles.tabActive]}
        onPress={() => setActiveTab('eventos')}
      >
        <Text style={[styles.tabText, activeTab === 'eventos' && styles.tabTextActive]}>
          Eventos ({eventosSensores.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'captura':
        return (
          <React.Fragment key="captura-content">
            <SensorControls />
            <SensorDisplay />
            
            {ultimoHashMidia && (
              <View key="hash-container" style={styles.hashContainer}>
                <Text key="hash-title" style={styles.hashTitle}>Última Captura:</Text>
                <Text key="hash-value" style={styles.hashValue}>{ultimoHashMidia}</Text>
              </View>
            )}

            <View key="gallery-section" style={styles.gallerySection}>
              <View key="section-header" style={styles.sectionHeader}>
                <Text key="section-title" style={styles.sectionTitle}>Capturas Recentes</Text>
                <Text key="section-subtitle" style={styles.sectionSubtitle}>
                  {midias.length} mídias • {stats.dispositivos_detectados} sensores
                </Text>
              </View>
              
              {midias.length === 0 ? (
                <View key="empty-state" style={styles.emptyState}>
                  <Text key="empty-state-text" style={styles.emptyStateText}>
                    Nenhuma captura realizada
                  </Text>
                  <Text key="empty-state-subtext" style={styles.emptyStateSubtext}>
                    Use os controles acima para começar
                  </Text>
                </View>
              ) : (
                midias.slice(0, 3).map(midia => {
                  const provaAssociada = provas.find(p => p.midia_id === midia._id);
                  return (
                    <MidiaItem key={`midia-${midia._id}`} midia={midia} prova={provaAssociada} />
                  );
                })
              )}
            </View>
          </React.Fragment>
        );

      case 'sensores':
        return (
          <View key="sensores-content" style={styles.tabContent}>
            <SensorDisplay />
            
            <View key="sensor-list" style={styles.sensorList}>
              <Text key="sensor-list-title" style={styles.sectionTitle}>Dispositivos BLE</Text>
              <View key="ble-empty-state" style={styles.emptyState}>
                <Text key="ble-empty-text" style={styles.emptyStateText}>
                  Nenhum dispositivo BLE detectado
                </Text>
                <Text key="ble-empty-subtext" style={styles.emptyStateSubtext}>
                  Para conectar a dispositivos BLE reais, instale e configure:
                  {"\n"}react-native-ble-plx
                </Text>
              </View>
            </View>
          </View>
        );

      case 'eventos':
        return (
          <View key="eventos-content" style={styles.tabContent}>
            <Text key="eventos-title" style={styles.sectionTitle}>Eventos de Sensores</Text>
            
            {eventosSensores.length === 0 ? (
              <View key="events-empty-state" style={styles.emptyState}>
                <Text key="events-empty-text" style={styles.emptyStateText}>
                  Nenhum evento detectado
                </Text>
                <Text key="events-empty-subtext" style={styles.emptyStateSubtext}>
                  Eventos críticos aparecerão aqui automaticamente
                </Text>
              </View>
            ) : (
              eventosSensores.map((evento, index) => (
                <View 
                  key={`event-${evento.timestamp}-${index}`} 
                  style={[
                    styles.eventItem,
                    evento.gravidade === 'critica' && styles.eventCritical,
                    evento.gravidade === 'alta' && styles.eventHigh
                  ]}
                >
                  <Text key={`event-type-${index}`} style={styles.eventType}>
                    {getEventIcon(evento.tipo)} {evento.tipo.toUpperCase()}
                  </Text>
                  <Text key={`event-details-${index}`} style={styles.eventDetails}>
                    Origem: {evento.sensor_origem} • Gravidade: {evento.gravidade}
                  </Text>
                  <Text key={`event-timestamp-${index}`} style={styles.eventTimestamp}>
                    {new Date(evento.timestamp).toLocaleString()}
                  </Text>
                  <Text key={`event-data-${index}`} style={styles.eventData}>
                    Dados: {JSON.stringify(evento.dados).substring(0, 100)}...
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      default:
        return null;
    }
  };

  const MidiaItem: React.FC<{ midia: Midia; prova?: Prova }> = ({ midia, prova }) => {
    const getStatusColor = (status?: StatusEnvio) => {
      switch (status) {
        case 'enviada': return '#00ff00';
        case 'enviando': return '#ffa500';
        case 'arquivada': return '#0096ff';
        case 'falha': return '#ff4444';
        default: return '#d4af37';
      }
    };

    const getStatusText = (status?: StatusEnvio) => {
      switch (status) {
        case 'enviada': return '✅ Enviada';
        case 'enviando': return '🔄 Enviando';
        case 'arquivada': return '📁 Arquivada';
        case 'falha': return '❌ Falha';
        default: return '⏰ Pendente';
      }
    };

    return (
      <View key={`midia-item-${midia._id}`} style={styles.midiaItem}>
        <View key={`midia-header-${midia._id}`} style={styles.midiaHeader}>
          <Text key={`midia-tipo-${midia._id}`} style={styles.midiaTipo}>
            {midia.tipo === 'foto' ? '📸' : '🎥'} {midia.tipo.toUpperCase()}
          </Text>
          <View key={`status-container-${midia._id}`} style={styles.statusContainer}>
            <Text 
              key={`status-text-${midia._id}`} 
              style={[styles.statusText, { color: getStatusColor(prova?.status_envio) }]}
            >
              {getStatusText(prova?.status_envio)}
            </Text>
          </View>
        </View>
        
        <Text key={`midia-hash-${midia._id}`} style={styles.midiaHash}>
          Hash: {midia.hash_sha256.substring(0, 24)}...
        </Text>

        {prova && (
          <View key={`sensors-info-${midia._id}`} style={styles.sensorsInfo}>
            <Text key={`sensors-text-${midia._id}`} style={styles.sensorsText}>
              📡 {prova.dispositivos_ble_detectados?.length || 0} sensores • 
              🚨 {prova.eventos_sensores?.length || 0} eventos • 
              {prova.modo_coleta && ` ⚙️ ${prova.modo_coleta}`}
            </Text>
          </View>
        )}

        <View key={`midia-actions-${midia._id}`} style={styles.midiaActions}>
          <TouchableOpacity key={`details-btn-${midia._id}`} style={styles.detailsButton}>
            <Text key={`details-text-${midia._id}`} style={styles.detailsButtonText}>Ver Detalhes</Text>
          </TouchableOpacity>

          {prova && prova.status_envio !== 'enviada' && (
            <TouchableOpacity key={`send-btn-${midia._id}`} style={styles.sendButton}>
              <Text key={`send-text-${midia._id}`} style={styles.sendButtonText}>Enviar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorer IoT</Text>
        <Text style={styles.subtitle}>Sensores Nativos + Detecção Automática</Text>
      </View>

      <ExplorerTabs />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={carregarDadosExplorer} />
        }
      >
        <ExplorerStats />
        
        {renderContent()}

        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Log do Sistema</Text>
          {logs.map(log => (
            <Text 
              key={log.id}  // ✅ Agora é único!
              style={[
                styles.logText,
                log.type === 'success' && styles.logSuccess,
                log.type === 'error' && styles.logError,
                log.type === 'warning' && styles.logWarning
              ]}
            >
              [{log.timestamp}] {log.message}
            </Text>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={modalCamera}
        animationType="slide"
        onRequestClose={() => {
          setModalCamera(false);
          if (gravandoVideo) {
            pararGravacao();
          }
        }}
      >
        <View style={styles.cameraContainer}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              ref={(ref) => setCameraRef(ref)}
            >
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.cameraCloseButton}
                  onPress={() => {
                    setModalCamera(false);
                    if (gravandoVideo) {
                      pararGravacao();
                    }
                  }}
                >
                  <Text style={styles.cameraCloseText}>✕</Text>
                </TouchableOpacity>
                
                <View style={styles.cameraMainControls}>
                  {cameraTipo === 'foto' ? (
                    <TouchableOpacity 
                      style={styles.captureButtonLarge}
                      onPress={tirarFoto}
                    >
                      <Text style={styles.captureButtonLargeText}>📸</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity 
                        style={[styles.captureButtonLarge, gravandoVideo && styles.recordingButton]}
                        onPress={gravandoVideo ? pararGravacao : iniciarGravacao}
                      >
                        <Text style={styles.captureButtonLargeText}>
                          {gravandoVideo ? '⏹️' : '🎥'}
                        </Text>
                      </TouchableOpacity>
                      {gravandoVideo && (
                        <View style={styles.recordingIndicator}>
                          <Text style={styles.recordingText}>● GRAVANDO</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </CameraView>
          ) : (
            <View style={styles.cameraPermissionContainer}>
              <Text style={styles.cameraPermissionText}>
                Permissão da câmera necessária
              </Text>
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>Conceder Permissão</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: { 
    color: '#ffd700', 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  subtitle: { 
    color: '#d4af37', 
    textAlign: 'center', 
    opacity: 0.8, 
    marginTop: 5,
    fontSize: 12
  },
  content: { 
    flex: 1, 
    padding: 15 
  },
  
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37'
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: '#ffd700'
  },
  tabText: {
    color: '#d4af37',
    fontSize: 11,
    textAlign: 'center'
  },
  tabTextActive: {
    color: '#ffd700',
    fontWeight: 'bold'
  },
  tabContent: {
    marginBottom: 20
  },
  
  statsContainer: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d4af37'
  },
  statsTitle: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 10
  },
  statNumber: {
    color: '#d4af37',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5
  },
  statLabel: {
    color: '#d4af37',
    fontSize: 10,
    textAlign: 'center'
  },
  
  sensorContainer: {
    backgroundColor: 'rgba(0, 100, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0096ff'
  },
  sensorTitle: {
    color: '#0096ff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  sensorGroup: {
    marginBottom: 10
  },
  sensorGroupTitle: {
    color: '#0096ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5
  },
  sensorData: {
    color: '#d4af37',
    fontSize: 11,
    marginBottom: 3
  },
  sensorDataInactive: {
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 3,
    opacity: 0.7
  },
  
  controlsSection: {
    marginBottom: 20
  },
  sectionTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  sensorControlsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  sensorControlButton: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2
  },
  manualButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderColor: '#ffa500'
  },
  truckButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderColor: '#00ff00'
  },
  cameraButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#ff4444'
  },
  activeButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.4)',
  },
  sensorControlIcon: {
    fontSize: 24,
    marginBottom: 5
  },
  sensorControlLabel: {
    color: '#d4af37',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center'
  },
  timerText: {
    color: '#ff4444',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5
  },
  
  sensorList: {
    marginTop: 20
  },
  deviceItem: {
    backgroundColor: '#1a1f1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0096ff'
  },
  deviceName: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  deviceDetails: {
    color: '#d4af37',
    fontSize: 11,
    marginBottom: 2
  },
  
  eventItem: {
    backgroundColor: '#1a1f1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4
  },
  eventCritical: {
    borderLeftColor: '#ff4444',
    backgroundColor: 'rgba(255, 0, 0, 0.1)'
  },
  eventHigh: {
    borderLeftColor: '#ffa500',
    backgroundColor: 'rgba(255, 165, 0, 0.1)'
  },
  eventType: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  eventDetails: {
    color: '#d4af37',
    fontSize: 11,
    marginBottom: 2
  },
  eventTimestamp: {
    color: '#d4af37',
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 4
  },
  eventData: {
    color: '#d4af37',
    fontSize: 9,
    fontFamily: 'monospace',
    opacity: 0.8
  },
  
  gallerySection: {
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionSubtitle: {
    color: '#d4af37',
    fontSize: 11,
    opacity: 0.8
  },
  midiaItem: {
    backgroundColor: '#1a1f1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37'
  },
  midiaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  midiaTipo: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold'
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  midiaHash: {
    color: '#d4af37',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 8
  },
  sensorsInfo: {
    backgroundColor: 'rgba(0, 150, 255, 0.1)',
    padding: 6,
    borderRadius: 5,
    marginBottom: 8
  },
  sensorsText: {
    color: '#0096ff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  midiaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailsButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginRight: 5
  },
  detailsButtonText: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: 'bold'
  },
  sendButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: '#00ff00'
  },
  sendButtonText: {
    color: '#00ff00',
    fontSize: 11,
    fontWeight: 'bold'
  },
  
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(26, 31, 26, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4af37',
    borderStyle: 'dashed'
  },
  emptyStateText: {
    color: '#d4af37',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    color: '#d4af37',
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center'
  },
  emptyText: {
    color: '#d4af37',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20
  },
  
  hashContainer: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d4af37'
  },
  hashTitle: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8
  },
  hashValue: {
    color: '#d4af37',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  
  logContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4af37'
  },
  logTitle: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  logText: {
    fontSize: 10,
    marginBottom: 3,
    fontFamily: 'monospace'
  },
  logSuccess: { color: '#00ff00' },
  logError: { color: '#ff4444' },
  logWarning: { color: '#ffa500' },
  
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black'
  },
  camera: {
    flex: 1
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20
  },
  cameraCloseButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5
  },
  cameraCloseText: {
    color: 'white',
    fontSize: 18
  },
  cameraMainControls: {
    alignSelf: 'flex-end',
    alignItems: 'center'
  },
  captureButtonLarge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 25,
    borderRadius: 50,
    marginBottom: 20
  },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.5)'
  },
  captureButtonLargeText: {
    fontSize: 28,
    color: 'white'
  },
  recordingIndicator: {
    backgroundColor: 'rgba(255,0,0,0.7)',
    padding: 10,
    borderRadius: 5
  },
  recordingText: {
    color: 'white',
    fontWeight: 'bold'
  },
  cameraPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black'
  },
  cameraPermissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center'
  },
  permissionButton: {
    backgroundColor: '#d4af37',
    padding: 15,
    borderRadius: 10
  },
  permissionButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16
  }
});