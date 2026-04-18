import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, removeApiKey } from '../lib/api';
import { Thermometer, Droplets, Sun, Battery, Server, LogOut, RefreshCw } from 'lucide-react';

interface SensorData {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  airTemperature: number | null;
  airHumidity: number | null;
  soilTemperature: number | null;
  soilHumidity: number | null;
  illuminance: number | null;
  batteryLevel: number | null;
  timestamp: string | null;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi('/sensors/latest');
      if (res.success) {
        setDevices(res.data);
      } else {
        throw new Error('数据获取失败');
      }
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        handleLogout();
      } else {
        setError(err.message || '获取设备数据出错');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 每 5 分钟自动刷新一次
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    removeApiKey();
    navigate('/login');
  };

  const handleControl = async (deviceId: string, command: 'ON' | 'OFF') => {
    try {
      await fetchApi('/irrigation/control', {
        method: 'POST',
        body: JSON.stringify({ deviceId, command }),
      });
      alert(`设备 ${deviceId} 阀门指令下发成功: ${command}`);
    } catch (err: any) {
      alert(`控制失败: ${err.message}`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '暂无数据';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Server className="mr-2 text-blue-600" />
            设备数据大屏
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center text-sm text-gray-600 hover:text-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center text-sm text-red-600 hover:text-red-800"
            >
              <LogOut className="w-4 h-4 mr-1" />
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && devices.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-500">正在加载数据...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Server className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无设备</h3>
            <p className="mt-1 text-sm text-gray-500">
              您当前使用的 API Key 尚未绑定任何设备。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <div key={device.deviceId} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {device.deviceName || '未命名设备'}
                      </h3>
                      <p className="max-w-2xl text-sm text-gray-500">
                        {device.deviceId} ({device.deviceType})
                      </p>
                    </div>
                    {device.batteryLevel !== null && (
                      <div className="flex items-center text-sm text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                        <Battery className="w-4 h-4 mr-1" />
                        {device.batteryLevel}%
                      </div>
                    )}
                  </div>

                  {device.deviceType === 'RENKE' ? (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <Thermometer className="w-4 h-4 mr-1 text-red-400" />
                          空气温度
                        </dt>
                        <dd className="mt-1 text-xl font-semibold text-gray-900">
                          {device.airTemperature !== null ? `${device.airTemperature.toFixed(2)} ℃` : '--'}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <Droplets className="w-4 h-4 mr-1 text-blue-400" />
                          空气湿度
                        </dt>
                        <dd className="mt-1 text-xl font-semibold text-gray-900">
                          {device.airHumidity !== null ? `${device.airHumidity.toFixed(2)} %` : '--'}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <Thermometer className="w-4 h-4 mr-1 text-orange-600" />
                          土壤温度
                        </dt>
                        <dd className="mt-1 text-xl font-semibold text-gray-900">
                          {device.soilTemperature !== null ? `${device.soilTemperature.toFixed(2)} ℃` : '--'}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <Droplets className="w-4 h-4 mr-1 text-cyan-600" />
                          土壤湿度
                        </dt>
                        <dd className="mt-1 text-xl font-semibold text-gray-900">
                          {device.soilHumidity !== null ? `${device.soilHumidity.toFixed(2)} %` : '--'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <Sun className="w-4 h-4 mr-1 text-yellow-500" />
                          光照度
                        </dt>
                        <dd className="mt-1 text-xl font-semibold text-gray-900">
                          {device.illuminance !== null ? `${device.illuminance.toFixed(2)} Lux` : '--'}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center space-y-4">
                      <p className="text-sm text-gray-500">该设备暂无环境数据上报</p>
                      <div className="flex space-x-4 w-full">
                        <button
                          onClick={() => handleControl(device.deviceId, 'ON')}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          开启 (ON)
                        </button>
                        <button
                          onClick={() => handleControl(device.deviceId, 'OFF')}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          关闭 (OFF)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center text-xs text-gray-500">
                  <span>最后同步：{formatDate(device.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
