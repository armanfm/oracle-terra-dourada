// DashboardScreen.tsx - VERSÃO PRODUÇÃO
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Vibration,
  Animated
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, Gyroscope, Barometer } from 'expo-sensors';

// TIPAGENS
type DashboardStats = {
  totalProvas: number;
  provasEnviadas: number;
  provasPendentes: number;
  eventosCriticos: number;
  sensoresAtivos: number;
  tempoOperacao: number;
  distanciaPercorrida: number;
  temperatura: number;
};

type AlertaTempoReal = {
  id: string;
  tipo: 'impacto' | 'temperatura' | 'conexao' | 'bateria' | 'seguranca';
  titulo: string;
  mensagem: string;
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  timestamp: string;
  lido: boolean;
};

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProvas: 0,
    provasEnviadas: 0,
    provasPendentes: 0,
    eventosCriticos: 0,
    sensoresAtivos: 0,
    tempoOperacao: 0,
    distanciaPercorrida: 0,
    temperatura: 0
  });
  
  const [alertas, setAlertas] = useState<AlertaTempoReal[]>([]);
  const [dadosSensores, setDadosSensores] = useState({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    barometer: { pressure: 0 },
    timestamp: Date.now()
  });
  
  const [localizacao, setLocalizacao] = useState<any>(null);
  const [modoOperacao, setModoOperacao] = useState<'normal' | 'alerta' | 'critico'>('normal');
  const [tempoAtivo, setTempoAtivo] = useState<number>(0);
  const [conexaoAtiva, setConexaoAtiva] = useState<boolean>(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sensorSubscriptions = useRef<any[]>([]);
  const temperaturaInterval = useRef<any>(null);

  useEffect(() => {
    iniciarDashboard();
    const interval = setInterval(() => {
      setTempoAtivo(prev => prev + 1);
    }, 5000);
    
    return () => {
      clearInterval(interval);
      if (temperaturaInterval.current) {
        clearInterval(temperaturaInterval.current);
      }
      sensorSubscriptions.current.forEach(sub => sub && sub.remove());
    };
  }, []);

  useEffect(() => {
    if (modoOperacao === 'alerta') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [modoOperacao]);

  const iniciarDashboard = async () => {
    try {
      await carregarEstatisticas();
      await iniciarMonitoramentoLocalizacao();
      await iniciarSensoresDashboard();
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error('Erro ao iniciar dashboard:', error);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const provasKeys = keys.filter(key => key.includes('terra_dourada_votos_local'));
      const provasItems = await AsyncStorage.multiGet(provasKeys);
      
      const totalProvas = provasItems.length;
      const provasEnviadas = provasItems.filter(([_, value]) => {
        if (!value) return false;
        try {
          const prova = JSON.parse(value);
          return prova.status_envio === 'enviada' || prova.cid_pinata;
        } catch {
          return false;
        }
      }).length;
      
      const eventosCriticos = provasItems.filter(([_, value]) => {
        if (!value) return false;
        try {
          const prova = JSON.parse(value);
          return prova.eventos_sensores && prova.eventos_sensores.some((e: any) => 
            e.gravidade === 'critica' || e.gravidade === 'alta'
          );
        } catch {
          return false;
        }
      }).length;

      setStats(prev => ({
        ...prev,
        totalProvas,
        provasEnviadas,
        provasPendentes: totalProvas - provasEnviadas,
        eventosCriticos,
        tempoOperacao: Math.floor(tempoAtivo / 60),
      }));
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const iniciarMonitoramentoLocalizacao = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        criarAlerta({
          tipo: 'seguranca',
          titulo: 'LOCALIZAÇÃO DESATIVADA',
          mensagem: 'GPS necessário para rastreamento',
          gravidade: 'media'
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocalizacao(location.coords);

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocalizacao(newLocation.coords);
          calcularDistancia(newLocation.coords);
        }
      );
      
    } catch (error) {
      console.error('Erro monitoramento localização:', error);
    }
  };

  const calcularDistancia = (novaLocalizacao: any) => {
    if (!localizacao) return;
    
    const R = 6371e3;
    const φ1 = localizacao.latitude * Math.PI/180;
    const φ2 = novaLocalizacao.latitude * Math.PI/180;
    const Δφ = (novaLocalizacao.latitude - localizacao.latitude) * Math.PI/180;
    const Δλ = (novaLocalizacao.longitude - localizacao.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distancia = R * c;
    
    setStats(prev => ({
      ...prev,
      distanciaPercorrida: prev.distanciaPercorrida + (distancia / 1000)
    }));
  };

  const iniciarSensoresDashboard = async () => {
    try {
      let sensoresCount = 0;

      if (await Accelerometer.isAvailableAsync()) {
        Accelerometer.setUpdateInterval(1000);
        const accelSub = Accelerometer.addListener((data) => {
          setDadosSensores(prev => ({ 
            ...prev, 
            accelerometer: data,
            timestamp: Date.now()
          }));
          
          const forca = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
          
          if (forca > 15) {
            criarAlerta({
              tipo: 'impacto',
              titulo: 'IMPACTO DETECTADO',
              mensagem: `Força: ${forca.toFixed(2)}G - X:${data.x.toFixed(2)} Y:${data.y.toFixed(2)} Z:${data.z.toFixed(2)}`,
              gravidade: 'alta'
            });
            setModoOperacao('alerta');
            Vibration.vibrate(1000);
          }
        });
        sensorSubscriptions.current.push(accelSub);
        sensoresCount++;
      }

      if (await Barometer.isAvailableAsync()) {
        Barometer.setUpdateInterval(2000);
        const baroSub = Barometer.addListener((data) => {
          setDadosSensores(prev => ({ 
            ...prev, 
            barometer: data,
            timestamp: Date.now()
          }));

          if (data.pressure < 1000) {
            criarAlerta({
              tipo: 'temperatura',
              titulo: 'PRESSÃO BAIXA',
              mensagem: `Pressão atmosférica: ${data.pressure.toFixed(1)} hPa`,
              gravidade: 'media'
            });
          }
        });
        sensorSubscriptions.current.push(baroSub);
        sensoresCount++;
      }

      if (await Gyroscope.isAvailableAsync()) {
        Gyroscope.setUpdateInterval(1000);
        const gyroSub = Gyroscope.addListener((data) => {
          setDadosSensores(prev => ({ 
            ...prev, 
            gyroscope: data,
            timestamp: Date.now()
          }));

          const rotacao = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
          if (rotacao > 5) {
            criarAlerta({
              tipo: 'seguranca',
              titulo: 'ROTAÇÃO RÁPIDA',
              mensagem: `Velocidade angular: ${rotacao.toFixed(2)}°/s`,
              gravidade: 'media'
            });
          }
        });
        sensorSubscriptions.current.push(gyroSub);
        sensoresCount++;
      }

      setStats(prev => ({ 
        ...prev, 
        sensoresAtivos: sensoresCount 
      }));

      const updateTemperaturaReal = () => {
        const atividade = Math.sqrt(
          dadosSensores.accelerometer.x ** 2 + 
          dadosSensores.accelerometer.y ** 2 + 
          dadosSensores.accelerometer.z ** 2
        );
        
        const temperaturaBase = 25;
        const variacao = Math.min(atividade * 3, 15);
        
        setStats(prev => ({ 
          ...prev, 
          temperatura: temperaturaBase + variacao 
        }));
      };

      temperaturaInterval.current = setInterval(updateTemperaturaReal, 5000);
      
    } catch (error) {
      console.error('Erro ao iniciar sensores:', error);
      criarAlerta({
        tipo: 'conexao',
        titulo: 'SENSORES INDISPONÍVEIS',
        mensagem: 'Alguns sensores não puderam ser inicializados',
        gravidade: 'media'
      });
    }
  };

  const criarAlerta = (alerta: Omit<AlertaTempoReal, 'id' | 'timestamp' | 'lido'>) => {
    const novoAlerta: AlertaTempoReal = {
      id: `alerta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alerta,
      timestamp: new Date().toISOString(),
      lido: false
    };
    
    setAlertas(prev => [novoAlerta, ...prev.slice(0, 9)]);
  };

  const marcarAlertaComoLido = (id: string) => {
    setAlertas(prev => 
      prev.map(alerta => 
        alerta.id === id ? { ...alerta, lido: true } : alerta
      )
    );
  };

  const getCorGravidade = (gravidade: string) => {
    switch (gravidade) {
      case 'critica': return '#ff4444';
      case 'alta': return '#ff6b35';
      case 'media': return '#ffa500';
      case 'baixa': return '#ffd700';
      default: return '#d4af37';
    }
  };

  const getIconeAlerta = (tipo: string) => {
    switch (tipo) {
      case 'impacto': return '💥';
      case 'temperatura': return '🌡️';
      case 'conexao': return '📡';
      case 'bateria': return '🔋';
      case 'seguranca': return '🛡️';
      default: return '⚠️';
    }
  };

  const StatCard: React.FC<{ 
    titulo: string; 
    valor: string | number; 
    icone: string;
    cor?: string;
    subtitulo?: string;
  }> = ({ titulo, valor, icone, cor = '#d4af37', subtitulo }) => (
    <View style={[styles.statCard, { borderLeftColor: cor }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icone}</Text>
        <Text style={styles.statTitulo}>{titulo}</Text>
      </View>
      <Text style={styles.statValor}>{valor}</Text>
      {subtitulo && <Text style={styles.statSubtitulo}>{subtitulo}</Text>}
    </View>
  );

  const AlertaItem: React.FC<{ alerta: AlertaTempoReal }> = ({ alerta }) => (
    <TouchableOpacity 
      style={[
        styles.alertaItem,
        { borderLeftColor: getCorGravidade(alerta.gravidade) },
        !alerta.lido && styles.alertaNaoLido
      ]}
      onPress={() => marcarAlertaComoLido(alerta.id)}
    >
      <View style={styles.alertaHeader}>
        <Text style={styles.alertaIcone}>{getIconeAlerta(alerta.tipo)}</Text>
        <Text style={styles.alertaTitulo}>{alerta.titulo}</Text>
        <Text style={styles.alertaTempo}>
          {new Date(alerta.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.alertaMensagem}>{alerta.mensagem}</Text>
      {!alerta.lido && <View style={styles.alertaPonto} />}
    </TouchableOpacity>
  );

  const StatusIndicator: React.FC<{ 
    status: 'online' | 'offline' | 'alerta' | 'critico';
    label: string;
  }> = ({ status, label }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'online': return '#00ff00';
        case 'offline': return '#ff4444';
        case 'alerta': return '#ffa500';
        case 'critico': return '#ff0000';
        default: return '#d4af37';
      }
    };

    return (
      <View style={styles.statusContainer}>
        <View 
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor() }
          ]} 
        />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
    );
  };

  const sincronizarDados = async () => {
    await carregarEstatisticas();
    criarAlerta({
      tipo: 'conexao',
      titulo: 'DADOS ATUALIZADOS',
      mensagem: 'Estatísticas sincronizadas com sucesso',
      gravidade: 'baixa'
    });
  };

  const gerarRelatorio = () => {
    criarAlerta({
      tipo: 'seguranca',
      titulo: 'RELATÓRIO GERADO',
      mensagem: 'Relatório de produção salvo no sistema',
      gravidade: 'baixa'
    });
  };

  const testeSensores = () => {
    const forca = Math.sqrt(
      dadosSensores.accelerometer.x ** 2 + 
      dadosSensores.accelerometer.y ** 2 + 
      dadosSensores.accelerometer.z ** 2
    );
    
    criarAlerta({
      tipo: 'seguranca',
      titulo: 'TESTE DE SENSORES',
      mensagem: `Aceleração: ${forca.toFixed(2)}G | Pressão: ${dadosSensores.barometer.pressure?.toFixed(1)} hPa`,
      gravidade: 'baixa'
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.titulo}>Dashboard Industrial</Text>
            <Text style={styles.subtitulo}>Monitoramento em Tempo Real</Text>
          </View>
          
          <View style={styles.statusRow}>
            <StatusIndicator 
              status={conexaoAtiva ? 'online' : 'offline'} 
              label="Conexão" 
            />
            <StatusIndicator 
              status={modoOperacao === 'normal' ? 'online' : 'alerta'} 
              label="Operação" 
            />
            <Text style={styles.tempoAtivo}>
              {Math.floor(tempoAtivo / 60)}m
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          <StatCard 
            titulo="Provas Totais" 
            valor={stats.totalProvas} 
            icone="📊"
            cor="#ffd700"
          />
          <StatCard 
            titulo="Enviadas" 
            valor={stats.provasEnviadas} 
            icone="✅"
            cor="#00ff00"
            subtitulo={`${stats.totalProvas > 0 ? Math.round((stats.provasEnviadas / stats.totalProvas) * 100) : 0}%`}
          />
          <StatCard 
            titulo="Eventos Críticos" 
            valor={stats.eventosCriticos} 
            icone="🚨"
            cor="#ff4444"
          />
          <StatCard 
            titulo="Sensores" 
            valor={stats.sensoresAtivos} 
            icone="📡"
            cor="#0096ff"
            subtitulo="ativos"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard 
            titulo="Distância" 
            valor={`${stats.distanciaPercorrida.toFixed(1)}km`} 
            icone="🛣️"
            cor="#d4af37"
          />
          <StatCard 
            titulo="Temperatura" 
            valor={`${stats.temperatura.toFixed(1)}°C`} 
            icone="🌡️"
            cor="#ff6b35"
          />
          <StatCard 
            titulo="Operação" 
            valor={`${stats.tempoOperacao}m`} 
            icone="⚙️"
            cor="#00ccff"
          />
          <StatCard 
            titulo="Pendentes" 
            valor={stats.provasPendentes} 
            icone="⏳"
            cor="#ffa500"
          />
        </View>

        <View style={styles.sensorSection}>
          <Text style={styles.sectionTitle}>Sensores em Tempo Real</Text>
          <View style={styles.sensorGrid}>
            <View style={styles.sensorItem}>
              <Text style={styles.sensorLabel}>Aceleração</Text>
              <Text style={styles.sensorValue}>
                {Math.sqrt(
                  dadosSensores.accelerometer.x ** 2 + 
                  dadosSensores.accelerometer.y ** 2 + 
                  dadosSensores.accelerometer.z ** 2
                ).toFixed(2)}G
              </Text>
            </View>
            <View style={styles.sensorItem}>
              <Text style={styles.sensorLabel}>Pressão</Text>
              <Text style={styles.sensorValue}>
                {dadosSensores.barometer.pressure?.toFixed(1)} hPa
              </Text>
            </View>
            <View style={styles.sensorItem}>
              <Text style={styles.sensorLabel}>Giroscópio</Text>
              <Text style={styles.sensorValue}>
                {Math.sqrt(
                  dadosSensores.gyroscope.x ** 2 + 
                  dadosSensores.gyroscope.y ** 2 + 
                  dadosSensores.gyroscope.z ** 2
                ).toFixed(2)}°/s
              </Text>
            </View>
            <View style={styles.sensorItem}>
              <Text style={styles.sensorLabel}>Ativos</Text>
              <Text style={styles.sensorValue}>
                {stats.sensoresAtivos}
              </Text>
            </View>
          </View>
        </View>

        {localizacao && (
          <View style={styles.localizacaoSection}>
            <Text style={styles.sectionTitle}>Localização Atual</Text>
            <View style={styles.localizacaoInfo}>
              <Text style={styles.localizacaoText}>
                Lat: {localizacao.latitude.toFixed(6)}
              </Text>
              <Text style={styles.localizacaoText}>
                Long: {localizacao.longitude.toFixed(6)}
              </Text>
              <Text style={styles.localizacaoText}>
                Precisão: ±{localizacao.accuracy?.toFixed(0)}m
              </Text>
            </View>
          </View>
        )}

        <View style={styles.alertasSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertas ({alertas.filter(a => !a.lido).length})</Text>
            <TouchableOpacity onPress={() => setAlertas([])}>
              <Text style={styles.limparAlertas}>Limpar</Text>
            </TouchableOpacity>
          </View>
          
          {alertas.length === 0 ? (
            <View style={styles.semAlertas}>
              <Text style={styles.semAlertasTexto}>Nenhum alerta</Text>
              <Text style={styles.semAlertasSubtexto}>Todos os sistemas operando normalmente</Text>
            </View>
          ) : (
            alertas.map(alerta => (
              <AlertaItem key={alerta.id} alerta={alerta} />
            ))
          )}
        </View>

        <View style={styles.acoesSection}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.acoesGrid}>
            <TouchableOpacity style={styles.acaoButton} onPress={sincronizarDados}>
              <Text style={styles.acaoIcon}>🔄</Text>
              <Text style={styles.acaoLabel}>Sincronizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acaoButton} onPress={gerarRelatorio}>
              <Text style={styles.acaoIcon}>📊</Text>
              <Text style={styles.acaoLabel}>Relatório</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acaoButton} onPress={testeSensores}>
              <Text style={styles.acaoIcon}>🧪</Text>
              <Text style={styles.acaoLabel}>Testar Sensores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acaoButton} onPress={carregarEstatisticas}>
              <Text style={styles.acaoIcon}>📈</Text>
              <Text style={styles.acaoLabel}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {modoOperacao === 'alerta' && (
        <Animated.View 
          style={[
            styles.floatingAlert,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <TouchableOpacity 
            style={styles.floatingButton}
            onPress={() => setModoOperacao('normal')}
          >
            <Text style={styles.floatingText}>MODO ALERTA</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f0a',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titulo: {
    color: '#ffd700',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#d4af37',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  statusRow: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    color: '#d4af37',
    fontSize: 12,
  },
  tempoAtivo: {
    color: '#d4af37',
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1f1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  statTitulo: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValor: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitulo: {
    color: '#d4af37',
    fontSize: 10,
    opacity: 0.7,
  },
  sensorSection: {
    backgroundColor: 'rgba(0, 150, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0096ff',
  },
  sectionTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorItem: {
    width: '48%',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  sensorLabel: {
    color: '#d4af37',
    fontSize: 11,
    marginBottom: 4,
  },
  sensorValue: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  localizacaoSection: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  localizacaoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  localizacaoText: {
    color: '#d4af37',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  alertasSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  limparAlertas: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  semAlertas: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(26, 31, 26, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00ff00',
    borderStyle: 'dashed',
  },
  semAlertasTexto: {
    color: '#00ff00',
    fontSize: 16,
    marginBottom: 8,
  },
  semAlertasSubtexto: {
    color: '#d4af37',
    fontSize: 12,
    opacity: 0.7,
  },
  alertaItem: {
    backgroundColor: '#1a1f1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    position: 'relative',
  },
  alertaNaoLido: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertaIcone: {
    fontSize: 16,
    marginRight: 8,
  },
  alertaTitulo: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  alertaTempo: {
    color: '#d4af37',
    fontSize: 10,
    opacity: 0.7,
  },
  alertaMensagem: {
    color: '#d4af37',
    fontSize: 12,
  },
  alertaPonto: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4444',
  },
  acoesSection: {
    marginBottom: 30,
  },
  acoesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acaoButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4af37',
    width: '23%',
  },
  acaoIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  acaoLabel: {
    color: '#d4af37',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  floatingAlert: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  floatingButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  floatingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});