export const nameRegex = /^[A-Za-z]{2,}$/;

export const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordRegex =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
