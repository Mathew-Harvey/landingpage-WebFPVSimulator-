/*
 * loader.js: the page's background work, and the rule for when it may run.
 *
 * WHY THIS EXISTS. The page used to do all of its heavy work behind the
 * loading screen: the town, its merge, and a warm pass that compiled every
 * shader and uploaded every buffer before the visitor saw anything. Measured
 * in the container, the screen stayed up for 27 seconds, for places the
 * visitor would not reach for a minute and might never reach at all. Now the
 * screen comes down as soon as the studio has drawn, and everything else is
 * built behind the film, by this.
 *
 * WHAT A JOB IS. A generator of steps. Each step is a piece of work short
 * enough to hide somewhere, and the generator yields between them. A step
 * may yield a PROMISE, a module to fetch or shaders compiling in parallel,
 * and then the job waits for it without holding anything up: the next job
 * gets the time meanwhile, and the waiting one is resumed with whatever the
 * promise resolved to, so `const mod = yield import(url)` reads as the
 * import it is.
 *
 * WHEN A STEP RUNS is not decided here. The caller hands pump() a budget in
 * milliseconds each frame, and pump() starts steps until it is spent. A step
 * cannot be interrupted, so a budget is a promise about when to STOP
 * starting, not about how long the work takes: a 400 ms district started at
 * the last moment of a 40 ms budget still takes 400 ms. That is why main.js
 * gives a budget only when a frame can afford to be late: see its notes on
 * `quiet`.
 *
 * ORDER. Jobs run in the order they are wanted. want() moves a job to the
 * front, which is how a jump to a chapter gets its place built first.
 *
 * FAILURE is recorded rather than thrown. A job that throws is finished, with
 * its error, and the page carries on without whatever it was building: a
 * hold waiting on it gives up rather than wait for ever. See failed().
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const isThenable = (v) => v !== null && typeof v === 'object' && typeof v.then === 'function';

export function createLoader({ now = () => performance.now() } = {}) {
  const jobs = [];
  const byId = new Map();

  /*
   * A job, by name. `make` returns its generator and is called the first time
   * the job gets a step, so nothing starts, not even a fetch, until the loader
   * has a moment for it. `onDone` is told the generator's return value.
   */
  function add(id, make, { onDone = null } = {}) {
    const job = {
      id,
      make,
      onDone,
      it: null,
      done: false,
      error: null,
      waiting: false,
      resume: undefined,
      steps: 0,
      /* Main thread time spent in this job's steps, ms: the number that says
       * what a job costs, because its wall clock time includes every frame it
       * waited for. */
      busy: 0,
      startedAt: -1,
      doneAt: -1,
    };
    jobs.push(job);
    byId.set(id, job);
    return job;
  }

  /* Put these jobs at the front, in the order given. */
  function want(...ids) {
    for (const id of [...ids].reverse()) {
      const job = byId.get(id);
      if (!job || job.done) {
        continue;
      }
      jobs.splice(jobs.indexOf(job), 1);
      jobs.unshift(job);
    }
  }

  function finish(job, value) {
    job.done = true;
    job.doneAt = now();
    if (job.onDone && !job.error) {
      try {
        job.onDone(value);
      } catch (e) {
        job.error = e;
        console.error(`loader: ${job.id} finished and its onDone threw`, e);
      }
    }
  }

  /* One step of one job. True if it did any work. */
  function step(job) {
    if (!job.it) {
      job.startedAt = now();
      try {
        job.it = job.make();
      } catch (e) {
        job.error = e;
        console.error(`loader: ${job.id} could not start`, e);
        finish(job);
        return true;
      }
    }
    const t0 = now();
    let r;
    try {
      const v = job.resume;
      job.resume = undefined;
      r = job.it.next(v);
    } catch (e) {
      job.busy += now() - t0;
      job.error = e;
      console.error(`loader: ${job.id} failed`, e);
      finish(job);
      return true;
    }
    job.busy += now() - t0;
    if (r.done) {
      finish(job, r.value);
      return true;
    }
    job.steps += 1;
    if (isThenable(r.value)) {
      job.waiting = true;
      r.value.then((v) => {
        job.resume = v;
        job.waiting = false;
      }, (e) => {
        job.waiting = false;
        job.error = e;
        console.error(`loader: ${job.id} failed waiting`, e);
        finish(job);
      });
    }
    return true;
  }

  /*
   * Start steps until `budget` ms have gone. Returns how long it actually
   * took, which can be longer than the budget by one step.
   */
  function pump(budget) {
    if (!(budget > 0)) {
      return 0;
    }
    const t0 = now();
    for (;;) {
      const job = jobs.find((j) => !j.done && !j.waiting);
      if (!job) {
        break;
      }
      step(job);
      if (now() - t0 >= budget) {
        break;
      }
    }
    return now() - t0;
  }

  return {
    add,
    want,
    pump,
    /* Finished, successfully or not. */
    done: (id) => Boolean(byId.get(id) && byId.get(id).done),
    /* Finished with an error: whatever it was building is not coming. */
    failed: (id) => Boolean(byId.get(id) && byId.get(id).error),
    /* Anything left to run or waiting on? */
    idle: () => jobs.every((j) => j.done),
    get(id) {
      return byId.get(id) || null;
    },
    /* What each job cost, for the debug handle. */
    report: () => jobs.map((j) => ({
      id: j.id,
      done: j.done,
      error: j.error ? String(j.error.message || j.error) : null,
      steps: j.steps,
      busyMs: Math.round(j.busy),
      wallMs: j.startedAt < 0 ? null : Math.round((j.doneAt < 0 ? now() : j.doneAt) - j.startedAt),
    })),
  };
}
