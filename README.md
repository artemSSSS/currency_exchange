# currency_exchange

CREATE DATABASE currency_exchange;


database password: 'newPassword'


CREATE TABLE users (
  name VARCHAR(20) UNIQUE,
  password VARCHAR(20)
);


CREATE TABLE accounts (
  currency VARCHAR(20),
  money INTEGER,
  owner VARCHAR(20)
);

CREATE TABLE transactions (
  id SERIAL,
  currency_from VARCHAR(20),
  currency_to VARCHAR(20),
  money INTEGER,
  owner VARCHAR(20),
  currency_exchange_course REAL,
  deadline TIMESTAMP
);
