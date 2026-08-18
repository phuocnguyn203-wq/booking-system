ALTER TABLE users 
ADD COLUMN hashedPassword TEXT NOT NULL,
ADD COLUMN username TEXT NOT NULL UNIQUE,
ADD CONSTRAINT email_validation CHECK (
    email ~* '^[A-Z0-9!#$%&''*+/=?^_`{|}~-]+([.][A-Z0-9!#$%&''*+/=?^_`{|}~-]+)*@[A-Z0-9]([A-Z0-9-]{0,61}[A-Z0-9])?([.][A-Z0-9]([A-Z0-9-]{0,61}[A-Z0-9])?)+$'
);
