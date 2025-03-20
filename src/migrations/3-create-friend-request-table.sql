CREATE TABLE friend_requests (
                             id SERIAL PRIMARY KEY,
                             sender_id INT NOT NULL,
                             receiver_id INT NOT NULL,
                             status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accept', 'reject')),
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             CONSTRAINT fk_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                             CONSTRAINT fk_receiver_id FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                             CONSTRAINT unique_request UNIQUE (sender_id, receiver_id)
);