export const AUTH_ERRORS = {
  FIRST_NAME: 'Only letters are allowed (min 2)!',
  LAST_NAME: 'Only letters are allowed (min 2)!',
  EMAIL: 'Please enter a valid email address',
  PASSWORD:
    'Password must be 8+ chars, 1 UpperCase, 1 Number, 1 Special char',
  CONFIRM_PASSWORD: 'Passwords do not match',
  REQUIRED: 'This field is required',
};

export const AUTH_SUCCESS = {
  SIGNUP: 'Signup Successful!',
  LOGIN: 'Login Successful!',
  RESET: 'Your password has been changed!',
};

export const AUTH_FAILURE = {
  LOGIN: 'Login Failed! Due to Invalid Credentials..',
};
