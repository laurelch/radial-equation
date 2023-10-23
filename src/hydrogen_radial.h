#ifdef __cplusplus
extern "C" {
#endif
void init_pot(double, int, double*, double*);
double solve_sheq(int, int, double, int,
            double, double*, double*,
            double*, double*, double*);
void do_mesh(int, double, double, double,
            double, double*, double*, double*);
double solve_radial(int, int, double, double*, double*, double*);
#ifdef __cplusplus
}
#endif