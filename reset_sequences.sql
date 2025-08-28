-- シーケンスリセット用SQL関数
-- Supabase SQL Editorで実行してください

-- poets テーブルのシーケンスをリセットする関数
CREATE OR REPLACE FUNCTION reset_poets_sequence()
RETURNS void AS $$
BEGIN
    -- シーケンスを1にリセット
    PERFORM setval(pg_get_serial_sequence('poets', 'id'), 1, false);
END;
$$ LANGUAGE plpgsql;

-- haikus テーブルのシーケンスをリセットする関数  
CREATE OR REPLACE FUNCTION reset_haikus_sequence()
RETURNS void AS $$
BEGIN
    -- シーケンスを1にリセット
    PERFORM setval(pg_get_serial_sequence('haikus', 'id'), 1, false);
END;
$$ LANGUAGE plpgsql;

-- 手動でシーケンスをリセットする場合のSQL
-- SELECT setval(pg_get_serial_sequence('poets', 'id'), 1, false);
-- SELECT setval(pg_get_serial_sequence('haikus', 'id'), 1, false);

-- 現在のシーケンス値を確認
-- SELECT currval(pg_get_serial_sequence('poets', 'id')) as poets_current_id;
-- SELECT currval(pg_get_serial_sequence('haikus', 'id')) as haikus_current_id;