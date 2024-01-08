DROP TABLE IF EXISTS pastes;
CREATE TABLE pastes (
	id SERIAL PRIMARY KEY,
  	language TEXT,
  	code TEXT NOT NULL
);


DROP TABLE comments IF EXISTS
CREATE TABLE comments (
  pasteid INT, 
  commentid SERIAL PRIMARY KEY, 
  comment TEXT,
    CONSTRAINT fk_pastes
        FOREIGN KEY(pasteid) 
	    REFERENCES pastes(id) ON DELETE CASCADE
);