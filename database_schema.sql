-- プロジェクト・タスク管理アプリ データベーススキーマ
-- Supabase用SQLスクリプト

-- 1. 顧客テーブル
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. LINEグループテーブル
CREATE TABLE line_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. プロジェクトテーブル
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0, -- 優先度（数値が大きいほど高優先）
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, waiting_confirmation, in_progress, completed
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. プロジェクトと顧客の関連テーブル（多対多）
CREATE TABLE project_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, customer_id)
);

-- 5. プロジェクトとLINEグループの関連テーブル（多対多）
CREATE TABLE project_line_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    line_group_id UUID NOT NULL REFERENCES line_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, line_group_id)
);

-- 6. タスクテーブル
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0, -- 優先度（数値が大きいほど高優先）
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, waiting_confirmation, in_progress, completed
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. 提案（複数案）テーブル
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- 提案内容
    reason TEXT, -- なぜこの案を考えたか
    is_adopted BOOLEAN DEFAULT FALSE, -- 採用されたかどうか
    proposal_order INTEGER DEFAULT 1, -- 提案順序（1, 2, 3...）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    -- タスクまたはプロジェクトのいずれかに紐づく
    CONSTRAINT proposals_reference CHECK (
        (task_id IS NOT NULL AND project_id IS NULL) OR 
        (task_id IS NULL AND project_id IS NOT NULL)
    )
);

-- 8. メモテーブル（各階層に紐づけ可能）
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
    -- 少なくとも1つの階層に紐づく必要がある
    CONSTRAINT memos_reference CHECK (
        customer_id IS NOT NULL OR 
        line_group_id IS NOT NULL OR 
        project_id IS NOT NULL OR 
        task_id IS NOT NULL OR
        proposal_id IS NOT NULL
    )
);

-- インデックスの作成（検索性能向上）
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

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時自動更新トリガーを設定
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