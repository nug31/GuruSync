-- ============================================================
-- Nomor HP para pimpinan tersimpan sebagai string kosong ('') bukan
-- NULL, jadi COALESCE(phone, ...) di migration sebelumnya tidak
-- pernah mengisinya (COALESCE cuma reaksi ke NULL, bukan ''). Fix
-- dengan SET paksa (bukan COALESCE) untuk semua nomor yang diketahui.
-- ============================================================

UPDATE teachers SET phone = '085710486710' WHERE nik = '8812010'; -- Putri Purwaningsih
UPDATE teachers SET phone = '081290244416' WHERE nik = '861880';  -- Elis Rika Sugiarti
UPDATE teachers SET phone = '085220907987' WHERE nik = '8814030'; -- Abdul Munir
UPDATE teachers SET phone = '087837155685' WHERE nik = '951883';  -- Puspita Sari
UPDATE teachers SET phone = '082112847033' WHERE nik = '8713012'; -- Nuryana Fitriyani
UPDATE teachers SET phone = '081932580977' WHERE nik = '9417064'; -- Aprilia Rahayu
UPDATE teachers SET phone = '082295444559' WHERE nik = '8915049'; -- Okxy Ixganda
UPDATE teachers SET phone = '082218005572' WHERE nik = '911770';  -- Astri Afmi Wulandari
UPDATE teachers SET phone = '081297083722' WHERE nik = '9518078'; -- Eldha Luvy Zha
UPDATE teachers SET phone = '085319953225' WHERE nik = '8814034'; -- Kiki Widhia Swara
UPDATE teachers SET phone = '081291506911' WHERE nik = '8813018'; -- Refty Royan Juniarti
UPDATE teachers SET phone = '082260878861' WHERE nik = '851766';  -- Abdillah Putra
UPDATE teachers SET phone = '083898079307' WHERE nik = '9014021'; -- Heru Triatmo
UPDATE teachers SET phone = '081212772973' WHERE nik = '9115043'; -- Hidayat Atori
UPDATE teachers SET phone = '089522956292' WHERE nik = '200897';  -- Dikky Apri Setia Nugraha
UPDATE teachers SET phone = '082210345111' WHERE nik = '881882';  -- Heri Supriyanto
UPDATE teachers SET phone = '082162683132' WHERE nik = '9520107'; -- Rahmat Hidayat

-- Cek cepat: harusnya 0 baris pimpinan yang masih phone kosong setelah ini
-- SELECT name, nik, app_role, phone FROM teachers WHERE app_role <> 'teacher' AND (phone IS NULL OR phone = '');
