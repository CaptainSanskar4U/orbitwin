from app.simulation.faults import FAULTS, BASELINE, simulate_ticks, recover_ticks, interpolate, nominal_wobble, rul_estimate, tick_noise


def test_all_faults_deterministic():
    for fid, f in FAULTS.items():
        ticks1 = list(simulate_ticks(fid))
        ticks2 = list(simulate_ticks(fid))
        assert ticks1 == ticks2, fid
        assert len(ticks1) == 7
        assert ticks1[0]["state"] == BASELINE
        for k, v in f["after"].items():
            assert ticks1[-1]["state"][k] == v, (fid, k)
        assert f["severity"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert len(f["chain"]) >= 4
        assert len(f["recommendations"]) == 3


def test_battery_values():
    f = FAULTS["battery_degradation"]
    assert f["after"]["battery_soc"] == 42.0
    assert f["after"]["battery_temp"] == 58.0
    rec = list(recover_ticks("battery_degradation"))
    assert rec[-1]["state"]["health"] == 73.0


def test_interpolate_midpoint():
    m = interpolate({"a": 0.0}, {"a": 10.0}, 0.5)
    assert m["a"] == 5.0


def test_invalid_fault():
    assert "nonexistent" not in FAULTS


def test_recovery_improves():
    for fid, f in FAULTS.items():
        rec = list(recover_ticks(fid))
        # recovered health strictly better than after-fault health
        assert rec[-1]["state"]["health"] > f["after"]["health"], fid


def test_sensor_failure_covers_ps_fault_list():
    f = FAULTS["sensor_failure"]
    assert len(f["affected"]) >= 3  # trap: cascade across >=3 subsystems
    assert len(f["chain"]) >= 4
    assert f["subsystems"]["Sensors"] == "CRITICAL"


def test_noise_is_deterministic_and_bounded():
    t1 = list(simulate_ticks("battery_degradation"))
    t2 = list(simulate_ticks("battery_degradation"))
    assert t1 == t2  # same input -> same output, always
    assert t1[0]["state"] == BASELINE  # endpoints exact
    for k, v in FAULTS["battery_degradation"]["after"].items():
        assert t1[-1]["state"][k] == v
    mid = t1[3]["state"]
    for k in BASELINE:
        assert abs(mid[k] - (BASELINE[k] + FAULTS["battery_degradation"]["after"][k]) / 2) < 1.5, k


def test_nominal_wobble_is_deterministic():
    assert nominal_wobble(100) == nominal_wobble(100)
    w = nominal_wobble(100)
    for k in BASELINE:
        assert abs(w[k] - BASELINE[k]) < 1.0, k


def test_rul_projection():
    rul = rul_estimate(BASELINE, FAULTS["battery_degradation"]["after"])
    assert rul is not None
    assert rul["metric"] in ("Battery SoC", "Battery Temp")
    assert rul["sim_min"] >= 0
    # healthy state has no critical projection... or far-future one
    assert rul_estimate(BASELINE, dict(BASELINE)) is None
