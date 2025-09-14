-- Add Members and Task Assignees tables for task assignment feature
-- Execute this in Supabase SQL Editor

-- 1. Members table for team member management
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    role VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Task assignees junction table (many-to-many relationship)
CREATE TABLE task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(task_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX idx_members_is_active ON members(is_active);
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_member_id ON task_assignees(member_id);

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (Supabase default)
GRANT ALL ON members TO postgres;
GRANT ALL ON members TO anon;
GRANT ALL ON members TO authenticated;
GRANT ALL ON members TO service_role;

GRANT ALL ON task_assignees TO postgres;
GRANT ALL ON task_assignees TO anon;
GRANT ALL ON task_assignees TO authenticated;
GRANT ALL ON task_assignees TO service_role;

-- Insert sample members (optional)
INSERT INTO members (name, email, role) VALUES
    ('田中太郎', 'tanaka@example.com', 'プロジェクトマネージャー'),
    ('佐藤花子', 'sato@example.com', 'エンジニア'),
    ('鈴木一郎', 'suzuki@example.com', 'デザイナー'),
    ('高橋美咲', 'takahashi@example.com', 'エンジニア');