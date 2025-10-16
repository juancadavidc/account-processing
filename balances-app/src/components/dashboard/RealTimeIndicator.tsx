'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/stores/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function RealTimeIndicator() {
  const { 
    realTimeConnected, 
    lastUpdated, 
    refreshData, 
    subscribeToRealTime,
    loading
  } = useDashboardStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      // If real-time is disconnected, try to reconnect
      if (!realTimeConnected) {
        subscribeToRealTime();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 30) {
      return 'Hace un momento';
    } else if (diffInSeconds < 60) {
      return `Hace ${diffInSeconds} segundos`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else {
      return format(date, 'HH:mm:ss');
    }
  };

  const getConnectionStatus = () => {
    if (loading) {
      return {
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        text: 'Cargando...',
        variant: 'secondary' as const,
        color: 'text-blue-600'
      };
    }
    
    if (realTimeConnected) {
      return {
        icon: <Wifi className="h-3 w-3" />,
        text: 'En tiempo real',
        variant: 'default' as const,
        color: 'text-green-600'
      };
    }
    
    return {
      icon: <WifiOff className="h-3 w-3" />,
      text: 'Desconectado',
      variant: 'destructive' as const,
      color: 'text-red-600'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border">
      {/* Connection Status Badge */}
      <Badge variant={connectionStatus.variant} className="flex items-center space-x-1">
        {connectionStatus.icon}
        <span>{connectionStatus.text}</span>
      </Badge>

      {/* Last Updated Info */}
      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>
          Última actualización: {formatLastUpdate(lastUpdated)}
        </span>
      </div>

      {/* Manual Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isRefreshing || loading}
        className="ml-auto"
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Actualizando...' : 'Actualizar'}
      </Button>
    </div>
  );
}

// Compact version for header
export function CompactRealTimeIndicator() {
  const { realTimeConnected } = useDashboardStore();

  const getConnectionIcon = () => {
    if (realTimeConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="flex items-center space-x-2">
      {getConnectionIcon()}
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {realTimeConnected ? 'En vivo' : 'Sin conexión'}
      </span>
    </div>
  );
}