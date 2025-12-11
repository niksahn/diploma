-- SQL скрипт для подготовки тестовых данных для User Service тестов
-- Выполняется перед запуском тестов

-- Вставка тестового администратора
INSERT INTO administrators (login, password) VALUES
('test_admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/1b4n7D3kJvQXJCQK') -- password: AdminPass123
ON CONFLICT (login) DO NOTHING;

-- Вставка тестового тарифа
INSERT INTO tariffs (name, description) VALUES
('Test Tariff', 'Tariff for testing purposes')
ON CONFLICT (name) DO NOTHING;

-- Получение ID администратора и тарифа
-- (в реальном использовании эти ID будут получены через запросы)

-- Вставка тестовых пользователей
INSERT INTO users (login, password, surname, name, patronymic, status) VALUES
('test_user_1@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/1b4n7D3kJvQXJCQK', 'Ivanov', 'Ivan', 'Ivanovich', 0),
('test_user_2@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/1b4n7D3kJvQXJCQK', 'Petrov', 'Petr', 'Petrovich', 0),
('test_user_3@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/1b4n7D3kJvQXJCQK', 'Sidorov', 'Sidor', 'Sidorovich', 0)
ON CONFLICT (login) DO NOTHING;

-- Создание тестового workspace (предполагаем, что admin_id = 1, tariff_id = 1)
-- В реальном тесте эти ID нужно получить через запросы к БД или API
INSERT INTO workspaces (name, creator, tariffsid) VALUES
('Test Workspace 1', 1, 1),
('Test Workspace 2', 1, 1)
ON CONFLICT (name) DO NOTHING;

-- Добавление пользователей в workspace
-- Предполагаем, что user_id = 1, 2, 3 и workspace_id = 1, 2
INSERT INTO userinworkspace (usersid, workspacesid, role, date) VALUES
(1, 1, 2, CURRENT_DATE), -- user 1 - руководитель workspace 1
(2, 1, 1, CURRENT_DATE), -- user 2 - участник workspace 1
(3, 2, 1, CURRENT_DATE)  -- user 3 - участник workspace 2
ON CONFLICT (usersid, workspacesid) DO NOTHING;










