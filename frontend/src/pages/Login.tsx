import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setApiKey, fetchApi } from '../lib/api';
import { KeyRound, Loader2 } from 'lucide-react';

export default function Login() {
  const [apiKey, setApiKeyValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 临时保存以便测试
      setApiKey(apiKey.trim());
      // 测试获取传感器数据以验证 API Key 是否有效
      await fetchApi('/sensors/latest');
      // 如果成功，跳转到数据面板
      navigate('/dashboard');
    } catch (err: any) {
      // 如果失败，清除无效的 key
      setApiKey('');
      setError(err.message || 'API Key 无效或请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <KeyRound className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            智能农业物联网中台
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请输入您的专属 API Key 以访问设备数据
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="api-key" className="sr-only">
                API Key
              </label>
              <input
                id="api-key"
                name="apiKey"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入 API Key (例如：test_key_123)"
                value={apiKey}
                onChange={(e) => setApiKeyValue(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                '登录系统'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
