        %% =====================================================
        % BLACKBOX COMPLETE PID ANALYSIS
        % Roll - Pitch - Yaw
        %
        % Requires:
        %   Control System Toolbox
        %   System Identification Toolbox
        %
        % CATATAN PERBAIKAN:
        % Kolom axisD[2] (D-term untuk Yaw) tidak selalu ada di file BFL,
        % karena Betaflight umumnya tidak memakai D pada axis Yaw. Jika kolom
        % tersebut tidak ditemukan, D di-set menjadi nol (bukan dibiarkan
        % kosong), supaya penjumlahan P+I+D+FF tidak error dan analisis bisa
        % lanjut ke axis berikutnya.
        %% =====================================================

        clear
        clc
        close all

        %% =====================================================
        % FILE
        %% =====================================================

        filename = 'LOG00046.BFL.csv';

        %% =====================================================
        % READ HEADER
        %% =====================================================

        fid = fopen(filename,'r');

        if fid < 0
            error('File tidak ditemukan');
        end

        header = fgetl(fid);
        fclose(fid);

        cols = strsplit(header,',');

        for k = 1:length(cols)
            cols{k} = erase(cols{k},'"');
        end

        %% =====================================================
        % IMPORT DATA
        %% =====================================================

        M = readmatrix(filename,'NumHeaderLines',1);

        fprintf('\nRows : %d\n',size(M,1));
        fprintf('Cols : %d\n',size(M,2));

        %% =====================================================
        % TIME
        %% =====================================================

        idxTime = find(strcmp(cols,'time'));

        if isempty(idxTime)
            error('Kolom time tidak ditemukan');
        end

        t = M(:,idxTime);

        t = (t - t(1))/1e6;

        Ts = mean(diff(t));

        fprintf('Sampling Time = %.6f s\n',Ts);

        %% =====================================================
        % AXIS INFO
        %% =====================================================

        axisName = {'ROLL','PITCH','YAW'};
        CL_all   = cell(1, 3);   % menyimpan CL model tiap axis untuk step overlay

        %% =====================================================
        % FILTER SETTINGS (dari Betaflight Configurator - Filter Settings)
        % Dipakai untuk: (1) dokumentasi/laporan, (2) replikasi PT1 di MATLAB
        % untuk verifikasi filter FC vs data blackbox, (3) penanda cutoff pada
        % spektrum noise gyro.
        %% =====================================================

        filterConfig.gyroLPF1_Hz   = 120;   % Gyro Lowpass 1 (PT1)
        filterConfig.gyroLPF2_Hz   = 250;   % Gyro Lowpass 2 (PT1)
        filterConfig.dtermLPF1_Hz  = 70;    % D-term Lowpass 1 (PT1) - Roll/Pitch
        filterConfig.dtermLPF2_Hz  = 100;   % D-term Lowpass 2 (PT1) - Roll/Pitch
        filterConfig.yawLPF_Hz     = 100;   % Yaw Lowpass Filter (PT1) - khusus axis Yaw
        filterConfig.dynNotchCount = 3;     % Dynamic Notch: jumlah notch
        filterConfig.dynNotchQ     = 200;   % Dynamic Notch: Q factor
        filterConfig.dynNotchMin_Hz = 80;   % Dynamic Notch: batas bawah frekuensi
        filterConfig.dynNotchMax_Hz = 400;  % Dynamic Notch: batas atas frekuensi

        % Rate profile (Betaflight Configurator - Rateprofile Settings, tipe "Actual")
        rateConfig.Roll  = struct('center', 40, 'maxRate', 220, 'expo', 0.50, 'maxVel', 220);
        rateConfig.Pitch = struct('center', 40, 'maxRate', 220, 'expo', 0.50, 'maxVel', 220);
        rateConfig.Yaw   = struct('center', 40, 'maxRate', 180, 'expo', 0.40, 'maxVel', 180);

        fprintf('\n=== FILTER SETTINGS (dari Betaflight) ===\n');
        fprintf('Gyro Lowpass   : LPF1 = %d Hz, LPF2 = %d Hz (PT1)\n', filterConfig.gyroLPF1_Hz, filterConfig.gyroLPF2_Hz);
        fprintf('D-term Lowpass : LPF1 = %d Hz, LPF2 = %d Hz (PT1)\n', filterConfig.dtermLPF1_Hz, filterConfig.dtermLPF2_Hz);
        fprintf('Yaw Lowpass    : %d Hz (PT1)\n', filterConfig.yawLPF_Hz);
        fprintf('Dynamic Notch  : %d notch, Q=%d, rentang %d-%d Hz\n', ...
            filterConfig.dynNotchCount, filterConfig.dynNotchQ, filterConfig.dynNotchMin_Hz, filterConfig.dynNotchMax_Hz);

        fprintf('\n=== RATE PROFILE (Actual) ===\n');
        rn = fieldnames(rateConfig);
        for k = 1:numel(rn)
            r = rateConfig.(rn{k});
            fprintf('%-6s: Center=%d  MaxRate=%d deg/s  Expo=%.2f  MaxVel=%d deg/s\n', ...
                rn{k}, r.center, r.maxRate, r.expo, r.maxVel);
        end

        %% =====================================================
        % LOOP ALL AXIS
        %% =====================================================

        for ax = 0:2

        fprintf('\n');
        fprintf('=====================================\n');
        fprintf('%s ANALYSIS\n',axisName{ax+1});
        fprintf('=====================================\n');

        %% -------------------------------------------------
        % COLUMN INDEX
        %% -------------------------------------------------

        idxSP   = find(strcmp(cols,sprintf('setpoint[%d]',ax)));
        idxGyro = find(strcmp(cols,sprintf('gyroADC[%d]',ax)));

        idxP = find(strcmp(cols,sprintf('axisP[%d]',ax)));
        idxI = find(strcmp(cols,sprintf('axisI[%d]',ax)));
        idxD = find(strcmp(cols,sprintf('axisD[%d]',ax)));

        idxFF = find(strcmp(cols,sprintf('axisF[%d]',ax)));

        if isempty(idxSP) || isempty(idxGyro)
            fprintf('Axis tidak ditemukan\n');
            continue
        end

        %% -------------------------------------------------
        % SIGNAL
        %% -------------------------------------------------

        sp   = M(:,idxSP);
        gyro = M(:,idxGyro);

        if ~isempty(idxP)
            P = M(:,idxP);
        else
            P = zeros(size(sp));
            fprintf('Catatan: axisP tidak ditemukan untuk %s, P di-set 0.\n', axisName{ax+1});
        end

        if ~isempty(idxI)
            I = M(:,idxI);
        else
            I = zeros(size(sp));
            fprintf('Catatan: axisI tidak ditemukan untuk %s, I di-set 0.\n', axisName{ax+1});
        end

        % --- FIX: axisD[2] (Yaw) sering tidak ada di log Betaflight ---
        if ~isempty(idxD)
            D = M(:,idxD);
        else
            D = zeros(size(sp));   % Yaw biasanya tidak punya D-term
            fprintf('Catatan: axisD tidak ditemukan untuk %s, D di-set 0.\n', axisName{ax+1});
        end

        if ~isempty(idxFF)
            FF = M(:,idxFF);
        else
            FF = zeros(size(sp));
            fprintf('Catatan: axisF tidak ditemukan untuk %s, FF di-set 0.\n', axisName{ax+1});
        end

        PID_OUT = P + I + D + FF;

        errorSignal = sp - gyro;

        %% -------------------------------------------------
        % ANALISIS FILTER GYRO (replikasi PT1 vs data aktual)
        %% -------------------------------------------------
        % Membandingkan: gyro mentah (gyroUnfilt) -> gyro hasil filter Flight
        % Controller (gyroADC, sudah ada di log) -> gyro hasil replikasi filter
        % PT1 di MATLAB memakai cutoff yang SAMA dengan setting Betaflight.
        % Kalau kurva "Replikasi MATLAB" dan "gyroADC (FC)" berhimpit, artinya
        % filter di FC sesuai konfigurasi Anda.

        idxGyroRaw = find(strcmp(cols, sprintf('gyroUnfilt[%d]', ax)));
        hasRaw = ~isempty(idxGyroRaw);

        hasSignalToolbox = license('test', 'Signal_Toolbox') && ~isempty(which('pwelch'));

        if hasRaw
            gyroRaw = M(:, idxGyroRaw);

            % --- fungsi PT1 sederhana (sesuai implementasi Betaflight) ---
            pt1Filter = @(x, cutoffHz, dt) filter( ...
                dt / (1/(2*pi*cutoffHz) + dt), ...
                [1, -(1 - dt / (1/(2*pi*cutoffHz) + dt))], ...
                x);

            gyroRepl = pt1Filter(gyroRaw, filterConfig.gyroLPF1_Hz, Ts);
            gyroRepl = pt1Filter(gyroRepl, filterConfig.gyroLPF2_Hz, Ts);
            if ax == 2   % axis Yaw dapat filter tambahan
                gyroRepl = pt1Filter(gyroRepl, filterConfig.yawLPF_Hz, Ts);
            end

            figure('Name', [axisName{ax+1} ' Filter Analysis'], 'Position', [150 150 1200 700]);

            subplot(2,1,1)
            plot(t, gyroRaw, 'Color', [0.85 0.5 0.5], 'DisplayName', 'Gyro mentah (unfiltered)'); hold on
            plot(t, gyro, 'b', 'LineWidth', 1.2, 'DisplayName', 'gyroADC (difilter FC)')
            plot(t, gyroRepl, 'g--', 'LineWidth', 1.2, 'DisplayName', 'Replikasi PT1 MATLAB')
            grid on
            legend('show')
            xlabel('Time (s)')
            ylabel('deg/s')
            title([axisName{ax+1} ' - Gyro: Mentah vs Filter FC vs Replikasi MATLAB'])

            subplot(2,1,2)
            if hasSignalToolbox
                [pRaw,  fRaw]  = pwelch(gyroRaw,  hann(2048), [], [], 1/Ts);
                [pFC,   fFC]   = pwelch(gyro,     hann(2048), [], [], 1/Ts);
                [pRepl, fRepl] = pwelch(gyroRepl, hann(2048), [], [], 1/Ts);

                semilogy(fRaw,  pRaw,  'Color', [0.85 0.5 0.5], 'DisplayName', 'Mentah'); hold on
                semilogy(fFC,   pFC,   'b',  'LineWidth', 1.2, 'DisplayName', 'gyroADC (FC)')
                semilogy(fRepl, pRepl, 'g--','LineWidth', 1.2, 'DisplayName', 'Replikasi MATLAB')

                % --- penanda cutoff filter sesuai setting Betaflight ---
                xline(filterConfig.gyroLPF1_Hz, ':k', sprintf('LPF1 %dHz', filterConfig.gyroLPF1_Hz), 'HandleVisibility','off');
                xline(filterConfig.gyroLPF2_Hz, ':k', sprintf('LPF2 %dHz', filterConfig.gyroLPF2_Hz), 'HandleVisibility','off');
                if ax == 2
                    xline(filterConfig.yawLPF_Hz, ':m', sprintf('Yaw LPF %dHz', filterConfig.yawLPF_Hz), 'HandleVisibility','off');
                end
                % --- area dynamic notch (informasi rentang kerja, bukan filter statis) ---
                yl = ylim;
                patch([filterConfig.dynNotchMin_Hz filterConfig.dynNotchMax_Hz filterConfig.dynNotchMax_Hz filterConfig.dynNotchMin_Hz], ...
                    [yl(1) yl(1) yl(2) yl(2)], [1 0.6 0.6], 'FaceAlpha', 0.12, 'EdgeColor','none', ...
                    'HandleVisibility','off');

                xlabel('Frekuensi (Hz)')
                ylabel('PSD (deg/s)^2/Hz')
                title('Spektrum Noise Gyro + Penanda Cutoff Filter')
                legend('show')
                grid on
            else
                text(0.05,0.5,'Signal Processing Toolbox (pwelch) tidak tersedia.', 'Units','normalized')
                axis off
            end
        else
            fprintf('Catatan: gyroUnfilt tidak ditemukan untuk %s, analisis filter dilewati.\n', axisName{ax+1});
        end

        %% -------------------------------------------------
        % ERROR ANALYSIS
        %% -------------------------------------------------

        rmsError = rms(errorSignal);

        maxError = max(abs(errorSignal));

        fprintf('RMS Error : %.3f\n',rmsError);
        fprintf('MAX Error : %.3f\n',maxError);

    %% -------------------------------------------------
    % IDENTIFICATION (n4sid + 3-fold CV + multi-window)
    %% -------------------------------------------------

    try

        %% -----------------------------------------------------
        % PILIH JENDELA WAKTU — top 5
        %% -----------------------------------------------------

        winSec = 6.0;
        stepSec = 0.3;
        Nwin = round(winSec/Ts);
        Nstep = max(1, round(stepSec/Ts));

        if length(sp) <= Nwin
            winSec = max(1.0, length(sp)*Ts*0.4);
            Nwin = round(winSec/Ts);
            fprintf('Catatan: data pendek, window dipersempit ke %.1f s\n', winSec);
        end

        startIdx = 1:Nstep:(length(sp)-Nwin);
        exciteScore = zeros(size(startIdx));
        for k = 1:length(startIdx)
            seg     = sp(  startIdx(k):startIdx(k)+Nwin-1);
            gyroSeg = gyro(startIdx(k):startIdx(k)+Nwin-1);
            exciteScore(k) = std(seg)*std(diff(seg)) + 0.3*std(gyroSeg)*std(diff(gyroSeg));
        end

        [sortedScores, sortIdx] = sort(exciteScore, 'descend');
        nCandidates = min(5, length(sortedScores));

        bestModel   = [];
        bestAvgFit  = -Inf;
        bestInfo    = [];

        optSS = ssestOptions('Focus', 'simulation', 'N4Weight', 'CVA', 'Display', 'off');

        for cand = 1:nCandidates

            winStart = startIdx(sortIdx(cand));
            padSec = 1.5;
            Npad = round(padSec/Ts);
            idA = max(1, winStart - Npad);
            idB = min(length(sp), winStart + Nwin + Npad);

            spWin   = detrend(sp(idA:idB), 0);
            gyroWin = detrend(gyro(idA:idB), 0);
            nData   = length(spWin);

            if nData < 100
                continue
            end

            % --- estimasi input delay ---
            try
                nDelay = delayest(iddata(gyroWin, spWin, Ts));
                nDelay = max(0, round(nDelay));
            catch
                nDelay = 0;
            end

            % --- 3-fold time-series CV ---
            n1 = floor(nData * 0.33);
            n2 = floor(nData * 0.67);
            b1 = 1:n1;
            b2 = n1+1:n2;
            b3 = n2+1:nData;
            foldTrain = {[b2 b3], [b1 b3], [b1 b2]};
            foldVal   = {b1, b2, b3};

            for npole = 2:3
                cvFits = zeros(1, 3);
                for f = 1:3
                    try
                        dTrain = iddata(gyroWin(foldTrain{f}), spWin(foldTrain{f}), Ts, 'InputDelay', nDelay);
                        dVal   = iddata(gyroWin(foldVal{f}),   spWin(foldVal{f}),   Ts, 'InputDelay', nDelay);

                        sFold = n4sid(dTrain, npole, 'Form', 'canonical', ...
                            'DisturbanceModel', 'none', optSS);
                        [~, fFit] = compare(dVal, sFold);
                        cvFits(f) = fFit;
                    catch
                        cvFits(f) = -Inf;
                    end
                end
                validFits = cvFits(cvFits > -Inf);
                avgFit = mean(validFits);
                if isempty(avgFit)
                    avgFit = -Inf;
                end

                if avgFit > bestAvgFit
                    bestAvgFit = avgFit;
                    bestInfo   = struct('cand',cand,'idA',idA,'idB',idB, ...
                        'score',sortedScores(cand),'npole',npole, ...
                        'nDelay',nDelay,'avgFit',avgFit,'cvFits',cvFits);
                end
            end
        end

        if isempty(bestInfo)
            error('Semua window / orde gagal.');
        end

        idA  = bestInfo.idA;
        idB  = bestInfo.idB;
        nDelay = bestInfo.nDelay;

        % retrain model terbaik pada full window
        spWin   = detrend(sp(idA:idB), 0);
        gyroWin = detrend(gyro(idA:idB), 0);
        data_full = iddata(gyroWin, spWin, Ts, 'InputDelay', nDelay);
        sys       = n4sid(data_full, bestInfo.npole, 'Form', 'canonical', ...
            'DisturbanceModel', 'none', optSS);
        sys = d2c(sys);   % konversi ke kontinu untuk pidtune

        fprintf('Jendela %s: t = %.2f-%.2f s (skor=%.1f, candidate #%d)\n', ...
            axisName{ax+1}, t(idA), t(idB), bestInfo.score, bestInfo.cand);
        fprintf('Model: orde %d (state-space n4sid), delay %d sampel\n', ...
            bestInfo.npole, nDelay);
        fprintf('3-fold CV fits: %.1f%%, %.1f%%, %.1f%%  (rata2 = %.1f%%)\n', ...
            bestInfo.cvFits(1), bestInfo.cvFits(2), bestInfo.cvFits(3), bestInfo.avgFit);

        if bestInfo.avgFit < 50
            warning(['CV fit rata2 %.1f%% rendah untuk %s -> model belum cukup dipercaya.'], ...
                bestInfo.avgFit, axisName{ax+1});
        end

        fprintf('\nIDENTIFIED MODEL (state-space, orde %d)\n', bestInfo.npole);
        disp(sys)
        fprintf('Equivalent transfer function:\n');
        disp(tf(sys))

        %% -----------------------------------------------------
        % VALIDASI MODEL (full window)
        %% -----------------------------------------------------

        figure('Name', [axisName{ax+1} ' Model Validation']);
        compare(data_full, sys);
        title(sprintf('%s - Model Fit (3-fold CV avg=%.1f%%)', axisName{ax+1}, bestInfo.avgFit));

        figure('Name', [axisName{ax+1} ' Residual']);
        resid(data_full, sys);
        sgtitle([axisName{ax+1} ' Residual Autocorrelation']);

        %% -----------------------------------------------------
        % PID TUNE — multi-bandwidth + fallback
        %% -----------------------------------------------------

        switch ax
            case 0
                wc0 = 80;   pm = 60;
            case 1
                wc0 = 80;   pm = 60;
            case 2
                wc0 = 40;   pm = 55;
        end

        wcCandidates = [wc0*0.4, wc0*0.6, wc0*0.8, wc0, wc0*1.2];
        bestC = [];
        bestScore = -Inf;
        bestWc = wc0;
        optP = pidtuneOptions('PhaseMargin', pm);

        for wcTry = wcCandidates
            try
                CTry = pidtune(sys, 'PID', wcTry, optP);
                CTry.Kp = max(CTry.Kp, 0.01);
                CTry.Ki = max(CTry.Ki, 0.01);
                CTry.Kd = max(CTry.Kd, 0.001);

                CLTry  = feedback(CTry * sys, 1);
                infoTry = stepinfo(CLTry);

                os = infoTry.Overshoot;
                st = infoTry.SettlingTime;
                rt = infoTry.RiseTime;

                if os > 25
                    score = -os*2 - st*5 - rt*10;
                else
                    score = wcTry - st*10 - rt*5;
                end

                if score > bestScore
                    bestScore = score;
                    bestC = CTry;
                    bestWc = wcTry;
                end
            catch ME
                fprintf('  wc=%.0f rad/s gagal: %s\n', wcTry, ME.message);
            end
        end

        if isempty(bestC)
            fprintf('  -> fallback: pidtune(sys,"PID") tanpa target bandwidth...\n');
            try
                CTry = pidtune(sys, 'PID');
                CTry.Kp = max(CTry.Kp, 0.01);
                CTry.Ki = max(CTry.Ki, 0.01);
                CTry.Kd = max(CTry.Kd, 0.001);
                bestC = CTry;
                bestWc = NaN;
                fprintf('  -> fallback berhasil.\n');
            catch ME2
                fprintf('  -> fallback juga gagal: %s\n', ME2.message);
                fprintf('  -> Axis %s dilewati (model tidak dapat dituning).\n', axisName{ax+1});
                error('PID tune gagal total');
            end
        end

        C = bestC;
        wc = bestWc;

        if isnan(wc)
            fprintf('\nPID RESULT (fallback, tanpa target bandwidth)\n');
        else
            fprintf('\nPID RESULT (wc=%.0f rad/s, pm=%.0f deg)\n', wc, pm);
        end
        disp(C)

        %% CLOSED LOOP

        CL = feedback(C*sys, 1);

        CL_all{ax+1} = CL;

        %% STEP INFO

        info = stepinfo(CL);

        fprintf('\nSTEP INFO\n');
        disp(info)

    catch ME

        fprintf('\nIDENTIFICATION ERROR\n');
        disp(ME.message)

    end

        end

        %% =====================================================
        % STEP RESPONSE OVERLAY - Roll, Pitch, Yaw dalam 1 Figure
        %% =====================================================

        figure('Name','Step Response Comparison',...
            'Position',[100 100 1000 600]);

        validIdx = find(~cellfun(@isempty, CL_all));

    if ~isempty(validIdx)
        sysList = CL_all(validIdx);
        step(sysList{:});
        h = findobj(gca, 'Type', 'Line');
        set(h, 'LineWidth', 1.5);
        legend(axisName(validIdx), 'Location', 'best');
    end

        grid on
        title('Step Response - Roll, Pitch, Yaw')
        xlabel('Time (s)')
        ylabel('Rate (deg/s)')

        fprintf('\n=========================\n');
        fprintf('ANALYSIS COMPLETE\n');
        fprintf('=========================\n');
