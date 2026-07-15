-- Keyword banks, persistent channel configuration, and PowerChat defaults.

alter table trend_settings add column if not exists keyword_banks jsonb;
alter table trend_settings add column if not exists active_keyword_bank_id text;
alter table trend_settings add column if not exists channel_id text;

alter table chatbot_data_access alter column trend_engine set default true;
alter table chatbot_data_access alter column metascraper set default true;
alter table chatbot_data_access alter column schedule set default true;
alter table chatbot_data_access alter column tasks set default true;

-- The product now treats PowerChat as an integrated assistant. Existing users
-- get the same all-on default and can still disable any source from the dock.
update chatbot_data_access
set trend_engine = true,
    metascraper = true,
    schedule = true,
    tasks = true,
    updated_at = now();
