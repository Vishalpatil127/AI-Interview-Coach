import { useEffect, useRef } from 'react';

const GoogleSignInButton = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) {
      onError('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in your client .env file.');
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: onSuccess,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const intervalId = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        initializeGoogle();
        window.clearInterval(intervalId);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [googleClientId, onError, onSuccess]);

  return <div ref={buttonRef} className="w-full" />;
};

export default GoogleSignInButton;
