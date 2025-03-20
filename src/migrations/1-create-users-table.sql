CREATE TABLE users (
                   id SERIAL PRIMARY KEY,
                   first_name VARCHAR(50) NOT NULL,
                   last_name VARCHAR(50) NOT NULL,
                   email VARCHAR(100) UNIQUE NOT NULL,
                   password_hash VARCHAR(255) NOT NULL,
                   age INT,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);