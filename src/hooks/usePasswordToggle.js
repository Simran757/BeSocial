import React, { useState } from 'react';

const usePasswordToggle = () => {
  const [secure, setSecure] = useState(true);

  const toggle = () => setSecure(prev => !prev);

  return {
    secure,
    toggle,
  };
};

export default usePasswordToggle;
