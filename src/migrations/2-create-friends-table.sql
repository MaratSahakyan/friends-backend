CREATE TABLE friends (
                     id SERIAL PRIMARY KEY,
                     user_id INT NOT NULL,
                     friend_id INT NOT NULL,
                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                     CONSTRAINT fk_friend_id FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
                     CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);