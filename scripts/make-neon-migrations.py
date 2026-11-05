"""Generate a staging-only starting point from the checked-in Supabase migrations.

The generated SQL is a migration candidate, not a production deployment. Review
and test it against Neon and its Data API before enabling the application.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
source = root / 'supabase' / 'migrations'
target = root / 'neon' / 'migrations'
target.mkdir(parents=True, exist_ok=True)
for file in sorted(source.glob('*.sql')):
    sql = file.read_text(encoding='utf-8')
    sql = sql.replace('auth.users', 'neon_auth."user"')
    sql = sql.replace('auth.uid()', '(auth.user_id())::uuid')
    sql = re.sub(r'\banon\b', 'anonymous', sql)
    sql = re.sub(r'(?<![.\w])gen_random_bytes\(', 'extensions.gen_random_bytes(', sql)
    if file.name == '202610180001_network.sql':
        sql = sql.replace('create extension if not exists pgcrypto with schema extensions;',
                          'create schema if not exists extensions;\ncreate extension if not exists pgcrypto with schema extensions;\ngrant usage on schema extensions to authenticated;')
    sql = '-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.\n' + sql
    (target / file.name).write_text(sql, encoding='utf-8', newline='\n')
