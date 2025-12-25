import { nameRegex, emailRegex, passwordRegex } from '../utils/regex';
import { AUTH_ERRORS } from './authMessages.service';

export const validateSignup = ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
}) => {
  let errors = {};

  if (!nameRegex.test(firstName))
    errors.firstName = AUTH_ERRORS.FIRST_NAME;

  if (!nameRegex.test(lastName))
    errors.lastName = AUTH_ERRORS.LAST_NAME;

  if (!emailRegex.test(email))
    errors.email = AUTH_ERRORS.EMAIL;

  if (!passwordRegex.test(password))
    errors.password = AUTH_ERRORS.PASSWORD;

  if (password !== confirmPassword)
    errors.confirmPassword = AUTH_ERRORS.CONFIRM_PASSWORD;

  return errors;
};

export const validateLogin = ({ email, password }) => {
  let errors = {};

  if (!emailRegex.test(email))
    errors.email = AUTH_ERRORS.EMAIL;

  if (!password)
    errors.password = AUTH_ERRORS.REQUIRED;

  return errors;
};

export const validateForgotPassword = ({ email }) => {
  let errors = {};

  if (!emailRegex.test(email))
    errors.email = AUTH_ERRORS.EMAIL;

  return errors;
};
