#ifdef __cplusplus
extern "C" {
#endif
void do_mesh ( int mesh, float zmesh, float xmin, 
            float dx, float rmax, 
            float *r, float *sqr, float *r2);
void init_pot(float zeta, int mesh, float *r, float *v_pot);
float solve_sheq(int n, int l, float zeta, int mesh, 
            float dx, float *r, float *sqr,
            float *r2, float *v_pot, float *y);
void solve_radial(int n, int l, float zeta);
#ifdef __cplusplus
}
#endif