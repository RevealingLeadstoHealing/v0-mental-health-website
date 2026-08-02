import React from 'react';

export default function Page() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1>Revealing Leads to Healing Wellness Services, LLC</h1>
      <p style={{ fontSize: '1.2rem', color: '#555', margin: '1.5rem 0' }}>
        Your path to wellness starts here. Secure Telehealth platform across New York State.
      </p>
      <a 
        href="/login" 
        style={{
          display: 'inline-block',
          backgroundColor: '#0070f3',
          color: 'white',
          padding: '0.8rem 2rem',
          borderRadius: '5px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '1.1rem'
        }}
      >
        Go to EHR Secure Provider Login
      </a>
    </div>
  );
}
