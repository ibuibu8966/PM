-- PM Support Tool - Complete Database Schema
-- Execute this in Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS claude_summaries CASCADE;
DROP TABLE IF EXISTS memos CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_line_groups CASCADE;
DROP TABLE IF EXISTS project_customers CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS line_groups CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS unregistered_tasks CASCADE;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 1. Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. LINE groups table
CREATE TABLE line_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started',
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Project-Customer relation table
CREATE TABLE project_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, customer_id)
);

-- 5. Project-LINE group relation table
CREATE TABLE project_line_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    line_group_id UUID NOT NULL REFERENCES line_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, line_group_id)
);

-- 6. Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started',
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Proposals table
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    reason TEXT,
    is_adopted BOOLEAN DEFAULT FALSE,
    proposal_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT proposals_reference CHECK (
        (task_id IS NOT NULL AND project_id IS NULL) OR 
        (task_id IS NULL AND project_id IS NOT NULL)
    )
);

-- 8. Memos table
CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    line_group_id UUID REFERENCES line_groups(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT memos_reference CHECK (
        customer_id IS NOT NULL OR 
        line_group_id IS NOT NULL OR 
        project_id IS NOT NULL OR 
        task_id IS NOT NULL OR
        proposal_id IS NOT NULL
    )
);

-- 9. Claude summaries table
CREATE TABLE claude_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Unregistered tasks table (for LINE integration)
CREATE TABLE unregistered_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_group_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sender_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deadline ON projects(deadline);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_proposals_task_id ON proposals(task_id);
CREATE INDEX idx_proposals_project_id ON proposals(project_id);
CREATE INDEX idx_project_customers_project_id ON project_customers(project_id);
CREATE INDEX idx_project_customers_customer_id ON project_customers(customer_id);
CREATE INDEX idx_project_line_groups_project_id ON project_line_groups(project_id);
CREATE INDEX idx_project_line_groups_line_group_id ON project_line_groups(line_group_id);
CREATE INDEX idx_claude_summaries_customer_id ON claude_summaries(customer_id);
CREATE INDEX idx_claude_summaries_date ON claude_summaries(summary_date);

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_groups_updated_at BEFORE UPDATE ON line_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memos_updated_at BEFORE UPDATE ON memos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claude_summaries_updated_at BEFORE UPDATE ON claude_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unregistered_tasks_updated_at BEFORE UPDATE ON unregistered_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (Supabase default)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;