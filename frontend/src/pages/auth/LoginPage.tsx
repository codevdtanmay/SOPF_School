import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, Flower2, HelpCircle, ShieldAlert } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { SchoolLogo } from '../../components/common/SchoolLogo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    // Email strict regex verification
    if (!email) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email (e.g. user@pansy.edu)');
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = await login(email, password);
      
      // Role Based Redirecting
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/unauthorized');
      }
    } catch (err: any) {
      setErrorStatus(err.message || 'Server Error. Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative dynamic ambient circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Blurred floral school logo background watermark */}
      <div className="absolute opacity-[0.03] text-slate-900 pointer-events-none flex items-center justify-center scale-150 transform rotate-12">
        <Flower2 size={480} className="stroke-[1.2]" />
      </div>

      {/* Main Glass Card container */}
      <div className="w-full max-w-md transform transition-all duration-300 hover:scale-[1.01] z-10">
        <div className="bg-white/80 backdrop-blur-md border border-slate-205 shadow-[0_8px_32px_rgba(15,23,42,0.06)] rounded-2xl p-8 md:p-10">
          
          {/* Header branding */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center mb-4">
              <SchoolLogo size={100} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none font-sans mb-2">
              The School of Pansy Flowers
            </h1>
            <p className="text-xs font-semibold text-slate-400 tracking-wide">
              Welcome back. Please sign in to continue.
            </p>
          </div>

          {/* Inline alert boxes for Invalid Credentials errors */}
          {errorStatus && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-800 animate-shake">
              <ShieldAlert className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Authentication Failed</p>
                <p className="font-medium opacity-90 mt-0.5">{errorStatus}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <Input
                id="email-address"
                label="EMAIL ADDRESS"
                type="text"
                placeholder="Enter Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                leftIcon={<Mail size={16} />}
              />
            </div>

            <div>
              <div className="flex items-center justify-between xl:h-0">
                {/* Visual align buffer */}
                <span />
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none cursor-pointer hover:underline mb-1"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                id="user-password"
                label="PASSWORD"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none flex items-center justify-center"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            {/* Quick Helper Credentials info panel */}
            <div className="p-3 bg-blue-50/40 border border-blue-100/60 rounded-xl space-y-1">
              <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block">
                Pansy Demo Accounts (password123 for all):
              </span>
              <ul className="text-[10px] text-slate-500 space-y-0.5 font-medium leading-none">
                <li>• Admin Account: <strong className="text-slate-700 select-all">admin@pansy.edu</strong></li>
                <li>• Teacher Account: <strong className="text-slate-700 select-all">teacher@pansy.edu</strong></li>
                <li>• Student Account: <strong className="text-slate-700 select-all">student@pansy.edu</strong></li>
              </ul>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={loading}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In To Panel'}
            </Button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Password Help"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsForgotModalOpen(false)}>
            Close Notice
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <HelpCircle size={24} />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-800">Contact ERP Administration</h4>
            <p className="text-xs text-slate-505 leading-relaxed mt-2.5">
              Please contact school administration or your department supervisor to reset your account password.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default LoginPage;
