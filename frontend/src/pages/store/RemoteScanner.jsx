import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { HiOutlineCheckCircle, HiOutlineCamera, HiOutlineRefresh } from 'react-icons/hi';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
const SOCKET_URL = process.env.REACT_APP_API_URL || `http://49.13.70.253:9898`;

const RemoteScanner = () => {
  const [searchParams] = useSearchParams();
  const session = searchParams.get('session');
  const [socket, setSocket] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!session) {
      setCameraError('Invalid Session URL. Please scan the QR from the Desktop ERP again.');
      return;
    }

    // Connect WebSocket
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_room', session);
      toast.success('Connected to Desktop Session');
    });

    return () => newSocket.disconnect();
  }, [session]);

  useEffect(() => {
    if (!session || cameraError) return;

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText, decodedResult) => {
            // Success Callback
            if (socket) {
              socket.emit('scan_event', { session, payload: decodedText });
              
              setLastScanned(decodedText);
              // Play a native beep sound on mobile
              try { navigator.vibrate && navigator.vibrate(200); } catch (e) {}
              
              // Prevent flooding by pausing briefly
              html5QrCode.pause();
              setTimeout(() => {
                setLastScanned(null);
                html5QrCode.resume();
              }, 1500);
            }
          },
          (errorMessage) => {
            // Parse Error Callback (ignore constant background noise)
          }
        );
      } catch (err) {
        console.error(err);
        setCameraError('Camera access denied or device not supported. Ensure you are on HTTPS or using localhost.');
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [session, socket]); // Include socket so it binds correctly

  const handleRetry = () => {
    window.location.reload();
  };

  if (!session) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', marginTop: '50px' }}>
        <h2>Invalid Session</h2>
        <p>No session ID found. Scan the Desktop QR code again.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e0e6f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', marginBottom: '20px' }}>
        <HiOutlineCamera /> Mobile Remote Scanner
      </h2>
      
      <p style={{ color: '#8892b0', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
        Point your camera at a Box barcode/QR. Data will instantly send to the desktop.
      </p>

      {cameraError ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#ef4444', marginBottom: '16px' }}>{cameraError}</p>
          <button className="btn btn-primary" onClick={handleRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineRefresh /> Retry Camera
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div id="reader" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(59, 130, 246, 0.3)' }}></div>
          
          {lastScanned && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(34, 197, 94, 0.85)', backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, animation: 'fadeIn 0.2s ease'
            }}>
              <HiOutlineCheckCircle style={{ fontSize: '4rem', color: '#fff', marginBottom: '12px' }} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', padding: '0 20px' }}>
                Scanned Successfully!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '8px' }}>{lastScanned.substring(0, 30)}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', maxWidth: '400px', width: '100%' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#8892b0', marginBottom: '8px', textTransform: 'uppercase' }}>Connection Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: socket?.connected ? '#22c55e' : '#ef4444' }}></div>
          <span style={{ fontWeight: 600, color: socket?.connected ? '#22c55e' : '#ef4444' }}>
            {socket?.connected ? 'Linked to Desktop' : 'Disconnected'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7a99', marginTop: '8px' }}>Session: {session}</div>
      </div>
    </div>
  );
};

export default RemoteScanner;
